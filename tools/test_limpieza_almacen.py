#!/usr/bin/env python3
"""Prueba la operación de limpieza y su ruta autorizada contra SQLite temporal."""
import copy
import json
import os
import pathlib
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'server'))
with tempfile.TemporaryDirectory(prefix='ng-clear-') as tmp:
    os.environ['DATA_DIR'] = tmp
    os.environ['REQUIRE_ADMIN_TOTP'] = '0'  # la prueba de permisos no necesita autenticación interactiva
    import novagest_server as s
    import warehouse_clear as wc
    s.init_db()
    w = [{'id': 'a', 'name': 'Principal', 'isDefault': True}, {'id': 'b', 'name': 'Viñales'}, {'id': 'c', 'name': 'Guane'}]
    state = {'warehouses': w, 'products': [
        {'id': 'p', 'name': 'Arroz', 'stocks': {'a': 5, 'b': 7, 'c': 4}, 'stocksInicial': {'a': 5, 'b': 4, 'c': 4}, 'stockActual': 16, 'stockInicial': 13, 'createdAt': 1},
        {'id': 'q', 'name': 'Sal', 'stocks': {'a': 2, 'b': 0, 'c': 0}, 'stocksInicial': {'a': 2, 'b': 0, 'c': 0}, 'stockActual': 2, 'stockInicial': 2}],
        'movements': [
            {'id': 'm1', 'warehouseId': 'b', 'productId': 'p', 'date': '2026-11-01', 'type': 'ENTRADA', 'quantity': 3, 'createdAt': 2},
            {'id': 'm2', 'warehouseId': 'b', 'productId': 'p', 'date': '2026-11-02', 'type': 'VENTA', 'quantity': 1, 'deletedAt': 2},
            {'id': 'm3', 'productId': 'p', 'date': '2026-11-03', 'type': 'ENTRADA', 'quantity': 1},
            {'id': 'm4', 'warehouseId': 'c', 'productId': 'p', 'date': '2026-11-04', 'type': 'ENTRADA', 'quantity': 1}],
        'warehouseEntries': [{'id': 'e', 'warehouseId': 'c', 'items': [{'warehouseId': 'b', 'field': 'stock'}], 'ts': 2}],
        'credits': [], 'audit': []}
    before = copy.deepcopy(state)
    out, details = wc.prepare(state, 'b', set(), 100, 'admin', 'op')
    assert state == before and details['movements'] == 2
    assert out['products'][0]['stocks'] == {'a': 5, 'b': 0, 'c': 4}
    assert out['products'][0]['stocksInicial'] == {'a': 5, 'b': 0, 'c': 4}
    assert out['products'][0]['stockActual'] == 9 and out['products'][0]['stockInicial'] == 9
    assert out['movements'][0]['warehouseCleared'] and 'quantity' not in out['movements'][0]
    assert out['movements'][1]['warehouseCleared'] and out['movements'][2:] == before['movements'][2:]
    assert out['warehouseEntries'][1]['invalidatedAt'] == 100
    primary, _ = wc.prepare(state, 'a', set(), 100, 'admin', 'op')
    assert primary['movements'][2]['warehouseCleared'] and primary['movements'][0] == state['movements'][0]
    for st, days, status in [(state, {'2026-11-02'}, 423), ({**state, 'credits': [{'movementIds': ['m2'], 'deletedAt': 5}]}, set(), 409)]:
        try:
            wc.prepare(st, 'b', days, 100, 'admin', 'op')
            assert False, 'debió rechazar'
        except wc.ClearError as e:
            assert e.status == status

    s.q('UPDATE app_state SET version=1,data=? WHERE id=1', (json.dumps(state),))
    s.index_state_changes(state, 1)
    admin = {'id': 1, 'username': 'admin', 'display_name': 'Admin', 'role': 'ADMINISTRADOR', 'totp_enabled': 1}
    class Handler:
        path, command = '/api/warehouses/clear', 'POST'
        def __init__(self, user, body): self.user, self.payload, self.result = user, body, None
        def auth(self): return self.user
        def body(self): return self.payload
        def ip(self): return '127.0.0.1'
        def err(self, status, error): self.result = (status, {'error': error}); return self.result
        def send_json(self, status, body): self.result = (status, body); return self.result
    route = s.ROUTES[('POST', '/api/warehouses/clear')]
    def request(role='ADMINISTRADOR', version=1, wid='b', confirmation='LIMPIAR'):
        h = Handler({**admin, 'role': role}, {'warehouseId': wid, 'version': version, 'confirmation': confirmation})
        route(h, None)
        return h.result
    for role in ('JEFE', 'ALMACENERO', 'ECONOMICO'):
        assert request(role=role)[0] == 403
    assert request(version=0)[0] == 409
    assert request(confirmation='si')[0] == 400
    s.q('INSERT INTO closed_days(date) VALUES(?)', ('2026-11-01',))
    assert request()[0] == 423
    s.q('DELETE FROM closed_days')
    real_backup = s.make_backup
    s.make_backup = lambda *args: (_ for _ in ()).throw(OSError('fallo de copia'))
    assert request()[0] == 503
    assert s.q('SELECT version FROM app_state WHERE id=1', one=True)['version'] == 1
    s.make_backup = real_backup
    real_read = s.read_backup
    s.read_backup = lambda name: {**real_read(name), 'version': 999}
    assert request()[0] == 409
    assert s.q('SELECT version FROM app_state WHERE id=1', one=True)['version'] == 1
    s.read_backup = real_read
    real_index = s.index_state_changes
    s.index_state_changes = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError('fallo de índice'))
    assert request()[0] == 500
    assert s.q('SELECT version FROM app_state WHERE id=1', one=True)['version'] == 1
    assert not s.q("SELECT 1 FROM audit WHERE action='WAREHOUSE_CLEAR'", one=True)
    s.index_state_changes = real_index
    status, result = request()
    assert status == 200, result
    assert result['version'] == 2 and result['movements'] == 2
    assert s.read_backup(result['backup'])['state'] == state
    current = json.loads(s.q('SELECT data FROM app_state WHERE id=1', one=True)['data'])
    assert current['products'][0]['stocks']['c'] == 4 and current['movements'][3] == state['movements'][3]
    assert s.q("SELECT 1 FROM state_records WHERE section='movements' AND rid='m1' AND ver=2", one=True)
    assert s.q("SELECT 1 FROM audit WHERE action='WAREHOUSE_CLEAR'", one=True)
    assert s.verificar_auditoria()['ok']
    assert s.validate_change(current, current, 'JEFE', set()) is None
    assert s.validate_change(current, state, 'ADMINISTRADOR', set())[0] == 409
    stale_entry = copy.deepcopy(current)
    stale_entry['warehouseEntries'][1].pop('invalidatedAt')
    assert s.validate_change(current, stale_entry, 'ADMINISTRADOR', set())[0] == 409
    stale = copy.deepcopy(current)
    stale['products'][0].pop('warehouseClearEpochs')
    assert s.validate_change(current, stale, 'ADMINISTRADOR', set())[0] == 409
    assert request()[0] == 409
    assert request(version=2)[1]['changed'] is False
    print('Limpieza por almacén: permisos, aislamiento, copia, auditoría, delta y conflictos correctos.')
