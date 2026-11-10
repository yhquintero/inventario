#!/usr/bin/env python3
"""Limpieza atómica de los 168 municipios de Cuba: permisos, integridad, aislamiento y copia."""
import copy
import json
import os
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'server'))
with tempfile.TemporaryDirectory(prefix='ng-batch-clear-') as tmp:
    os.environ.update(DATA_DIR=tmp, REQUIRE_ADMIN_TOTP='0')
    import novagest_server as s
    s.init_db()
    warehouses = [{'id': f'w{i}', 'name': s._municipal_warehouse_name(prov, name), 'location': f'{name}, {prov}', 'isDefault': i == 0, 'active': True}
                  for i, (prov, name, code) in enumerate(s.CUBA_MUNICIPALITIES)]
    warehouses.append({'id': 'extra', 'name': 'Almacén independiente'})
    ids = [w['id'] for w in warehouses[:168]]
    stock = {wid: 4 for wid in ids + ['extra']}
    state = {'warehouses': warehouses,
             'products': [{'id': 'p', 'name': 'Producto', 'stocks': copy.deepcopy(stock),
                           'stocksInicial': copy.deepcopy(stock), 'stockActual': 168 * 4, 'stockInicial': 168 * 4}],
             'movements': [{'id': f'm{i}', 'warehouseId': wid, 'productId': 'p', 'date': '2026-11-01',
                            'quantity': 1, 'type': 'ENTRADA'} for i, wid in enumerate(ids + ['extra'])],
             'warehouseEntries': [], 'credits': [], 'audit': []}
    s.q('UPDATE app_state SET version=1,data=? WHERE id=1', (json.dumps(state),))
    s.index_state_changes(state, 1)
    admin = {'id': 1, 'username': 'admin', 'display_name': 'Admin', 'role': 'ADMINISTRADOR', 'totp_enabled': 1}
    class Handler:
        path, command = '/api/warehouses/clear', 'POST'
        def __init__(self, user, payload): self.user, self.payload, self.result = user, payload, None
        def auth(self): return self.user
        def body(self): return self.payload
        def ip(self): return '127.0.0.1'
        def err(self, code, error): self.result = (code, {'error': error})
        def send_json(self, code, body): self.result = (code, body)
    route = s.ROUTES[('POST', '/api/warehouses/clear')]
    def call(payload=None, role='ADMINISTRADOR'):
        h = Handler({**admin, 'role': role}, payload or {'municipalityIds': ids, 'version': 1, 'confirmation': 'LIMPIAR 168 MUNICIPIOS'})
        route(h, None)
        return h.result
    assert call(role='JEFE')[0] == 403
    assert call({'municipalityIds': ids, 'version': 1, 'confirmation': 'LIMPIAR'})[0] == 400
    assert call({'municipalityIds': ids[:167] + ['extra'], 'version': 1, 'confirmation': 'LIMPIAR 168 MUNICIPIOS'})[0] == 409
    assert call({'municipalityIds': ids, 'version': 0, 'confirmation': 'LIMPIAR 168 MUNICIPIOS'})[0] == 409
    assert call({'municipalityIds': ids[:-1] + ids[:1], 'version': 1, 'confirmation': 'LIMPIAR 168 MUNICIPIOS'})[0] == 400
    duplicate = copy.deepcopy(state)
    duplicate['warehouses'].append({'id': 'dup', 'name': 'ALMACEN VIÑALES (CENTRAL)'})
    s.q('UPDATE app_state SET data=? WHERE id=1', (json.dumps(duplicate),))
    assert call()[0] == 409
    s.q('UPDATE app_state SET data=? WHERE id=1', (json.dumps(state),))
    # Si uno de los municipios tiene día cerrado o un fiado, ninguno se modifica.
    s.q('INSERT INTO closed_days(date) VALUES(?)', ('2026-11-01',))
    assert call()[0] == 423
    assert s.q('SELECT version FROM app_state WHERE id=1', one=True)['version'] == 1
    s.q('DELETE FROM closed_days')
    credit_state = copy.deepcopy(state)
    credit_state['credits'] = [{'id': 'c', 'movementIds': ['m10']}]
    s.q('UPDATE app_state SET data=? WHERE id=1', (json.dumps(credit_state),))
    assert call()[0] == 409
    assert json.loads(s.q('SELECT data FROM app_state WHERE id=1', one=True)['data']) == credit_state
    s.q('UPDATE app_state SET data=? WHERE id=1', (json.dumps(state),))
    real_backup = s.make_backup
    s.make_backup = lambda *args: (_ for _ in ()).throw(OSError('sin copia'))
    assert call()[0] == 503
    s.make_backup = real_backup
    real_index = s.index_state_changes
    s.index_state_changes = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError('sin índice'))
    assert call()[0] == 500
    assert s.q('SELECT version FROM app_state WHERE id=1', one=True)['version'] == 1
    s.index_state_changes = real_index
    status, res = call()
    assert status == 200, res
    assert res['version'] == 2 and res['changed'] and res['movements'] == 168
    assert s.read_backup(res['backup'])['state'] == state
    final = json.loads(s.q('SELECT data FROM app_state WHERE id=1', one=True)['data'])
    assert all(final['products'][0]['stocks'][wid] == 0 for wid in ids)
    assert final['products'][0]['stocks']['extra'] == 4 and final['products'][0]['stockActual'] == 4
    assert final['movements'][-1] == state['movements'][-1]
    assert all(m.get('warehouseCleared') for m in final['movements'][:168])
    assert len([e for e in final['warehouseEntries'] if e['kind'] == 'LIMPIEZA' and e['date']]) == 168
    assert s.verificar_auditoria()['ok']
    assert s.validate_change(final, final, 'ADMINISTRADOR', set()) is None
    assert call()[0] == 409
    print('Limpieza de 168 municipios de Cuba: aprobación, copia y atomicidad verificadas.')
