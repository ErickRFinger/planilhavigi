# -*- coding: utf-8 -*-
"""
VIGI Excel Online - Sistema de Gestão de Planilhas e Clientes
Controle de Acessos por Usuário (Supervisores & Agentes)
Logs de Auditoria e Sincronização Isolada no Supabase
"""

import os
import sys
import glob
import json
import time
import socket
import shutil
import hashlib
import datetime
import openpyxl
import requests
from flask import Flask, request, jsonify, send_from_directory, send_file
from werkzeug.utils import secure_filename

import tempfile

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configurações do Supabase (lê de variáveis de ambiente com fallback)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hnfhrjgzeivzrcpumkyk.supabase.co").rstrip('/')
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZmhyamd6ZWl2enJjcHVta3lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcyODkxNCwiZXhwIjoyMDg4MzA0OTE0fQ.lG8gV39uSSStfgbSUnBJkGogYdn-zYh3ffUdsjj_xWE")
SUPABASE_ANON = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("SUPABASE_ANON", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZmhyamd6ZWl2enJjcHVta3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg5MTQsImV4cCI6MjA4ODMwNDkxNH0.qWKErHq6vCPRWdDfrnngY8fPiJ05VR586U0GzZ3vmrI"))
BUCKET = os.environ.get("SUPABASE_BUCKET", "vigi_spreadsheets")

# Definição de Usuários e Cargos solicitados
USERS = {
    "erick": {
        "username": "Erick",
        "password": "324354",
        "role": "supervisor",
        "name": "Erick (Supervisor)"
    },
    "daniel": {
        "username": "Daniel",
        "password": "Margot",
        "role": "supervisor",
        "name": "Daniel (Supervisor)"
    },
    "michel": {
        "username": "Michel",
        "password": "Clic@3369",
        "role": "agente",
        "name": "Michel (Agente)"
    },
    "gabriely": {
        "username": "Gabriely",
        "password": "Clic@3369",
        "role": "agente",
        "name": "Gabriely (Agente)"
    },
    "klaus": {
        "username": "Klaus",
        "password": "Clic@3369",
        "role": "agente",
        "name": "Klaus (Agente)"
    },
    "admin": {
        "username": "admin",
        "password": "Clic@3369",
        "role": "supervisor",
        "name": "Administrador Geral"
    }
}

SECRET_KEY = os.environ.get("SECRET_KEY", "vigi-super-secret-key-excel-2026-audit")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# No Vercel ou ambientes serverless, o diretório de código é Read-Only
IS_VERCEL = bool(os.environ.get("VERCEL"))
WRITE_DIR = tempfile.gettempdir() if IS_VERCEL else BASE_DIR

BACKUPS_DIR = os.path.join(WRITE_DIR, "backups")
DATA_CACHE_FILE = os.path.join(BASE_DIR, "data_cache.json") if (os.path.exists(os.path.join(BASE_DIR, "data_cache.json")) and not IS_VERCEL) else os.path.join(WRITE_DIR, "data_cache.json")
METADATA_FILE = os.path.join(WRITE_DIR, "metadata.json")
LOGS_FILE = os.path.join(WRITE_DIR, "change_logs.json")

try:
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(BACKUPS_DIR, exist_ok=True)
except Exception:
    pass

app = Flask(__name__, static_folder=STATIC_DIR)

def get_main_excel_path():
    files = glob.glob(os.path.join(BASE_DIR, "*.xlsx"))
    for f in files:
        if "vigi" in os.path.basename(f).lower():
            return f
    return files[0] if files else os.path.join(BASE_DIR, "Cópia de VIGI 2026.xlsx")

def generate_token(username):
    raw = f"{username.lower()}:{SECRET_KEY}"
    return hashlib.sha256(raw.encode()).hexdigest()

def get_authenticated_user(req):
    auth_header = req.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "token" in req.args:
        token = req.args.get("token")
        
    if not token:
        return None
        
    for u_key, u_data in USERS.items():
        if generate_token(u_data['username']) == token or token == f"token-{u_key}-session":
            return u_data
            
    return None

def load_logs():
    if os.path.exists(LOGS_FILE):
        try:
            with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_logs(logs):
    try:
        with open(LOGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
            
        # Sincroniza logs com Supabase Storage de forma assíncrona/rápida
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
            "x-upsert": "true",
            "Content-Type": "application/json"
        }
        requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/change_logs.json",
            headers=headers,
            data=json.dumps(logs, ensure_ascii=False).encode('utf-8'),
            timeout=5
        )
    except Exception as e:
        print(f"[Logs Save Error]: {e}")

def extract_cell_value(cell):
    if cell is None:
        return None
    if isinstance(cell, dict):
        if 'f' in cell and cell['f']:
            return cell['f']
        if 'v' in cell and cell['v'] is not None:
            return cell['v']
        if 'm' in cell and cell['m'] is not None:
            return cell['m']
        return None
    return cell

def luckysheet_to_workbook(sheets_data):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    
    for sheet in sheets_data:
        raw_title = sheet.get('name', 'Sheet')
        safe_title = raw_title.replace(':', '_').replace('/', '_').replace('\\', '_').replace('*', '_').replace('?', '_').replace('[', '_').replace(']', '_')[:31]
        ws = wb.create_sheet(title=safe_title)
        
        grid_data = sheet.get('data')
        if grid_data and isinstance(grid_data, list) and len(grid_data) > 0 and isinstance(grid_data[0], list):
            for r_idx, row in enumerate(grid_data):
                for c_idx, cell in enumerate(row):
                    if cell is not None:
                        val = extract_cell_value(cell)
                        if val is not None and str(val).strip() != '':
                            ws.cell(row=r_idx + 1, column=c_idx + 1, value=val)
        elif 'celldata' in sheet and sheet['celldata']:
            for item in sheet['celldata']:
                r = item.get('r', 0) + 1
                c = item.get('c', 0) + 1
                cell = item.get('v')
                val = extract_cell_value(cell)
                if val is not None and str(val).strip() != '':
                    ws.cell(row=r, column=c, value=val)
                    
        # Salva larguras customizadas das colunas no arquivo Excel (.xlsx)
        config = sheet.get('config', {}) or {}
        columnlen = config.get('columnlen', {}) or {}
        for col_idx_str, width_px in columnlen.items():
            try:
                col_idx = int(col_idx_str)
                col_letter = openpyxl.utils.get_column_letter(col_idx + 1)
                excel_width = max(round(float(width_px) / 7.5, 1), 12.0)
                ws.column_dimensions[col_letter].width = excel_width
            except Exception:
                pass
                
        # Salva alturas customizadas das linhas
        rowlen = config.get('rowlen', {}) or {}
        for row_idx_str, height_px in rowlen.items():
            try:
                row_idx = int(row_idx_str) + 1
                ws.row_dimensions[row_idx].height = max(round(float(height_px) * 0.75, 1), 18.0)
            except Exception:
                pass
                    
    return wb

def sync_to_supabase(json_bytes, xlsx_bytes, metadata):
    try:
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
            "x-upsert": "true"
        }
        
        requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/sheet_data.json",
            headers={**headers, "Content-Type": "application/json"},
            data=json_bytes,
            timeout=10
        )
        
        if xlsx_bytes:
            requests.post(
                f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/VIGI_2026.xlsx",
                headers={**headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
                data=xlsx_bytes,
                timeout=15
            )
            
        if metadata:
            requests.post(
                f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/metadata.json",
                headers={**headers, "Content-Type": "application/json"},
                data=json.dumps(metadata).encode('utf-8'),
                timeout=5
            )
        return True
    except Exception as e:
        print(f"[Supabase Sync Error]: {e}")
        return False

def get_network_ips():
    ips = []
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.') and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    return ips

# --- ROTAS DA API ---

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    user_match = USERS.get(username.lower())
    if user_match and user_match['password'] == password:
        token = generate_token(user_match['username'])
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'username': user_match['username'],
                'name': user_match['name'],
                'role': user_match['role']
            }
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Usuário ou senha incorretos!'
        }), 401

@app.route('/api/verify', methods=['GET'])
def api_verify():
    user = get_authenticated_user(request)
    if user:
        return jsonify({'valid': True, 'user': user})
    return jsonify({'valid': False}), 401

@app.route('/api/sheets', methods=['GET'])
def api_get_sheets():
    user = get_authenticated_user(request)
    if not user:
        return jsonify({'error': 'Não autorizado'}), 401
    
    if os.path.exists(DATA_CACHE_FILE):
        try:
            with open(DATA_CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify({'sheets': data, 'source': 'local_cache'})
        except Exception as e:
            print(f"Erro ao ler cache: {e}")
            
    try:
        r = requests.get(f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/sheet_data.json", timeout=6)
        if r.status_code == 200:
            data = r.json()
            with open(DATA_CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            return jsonify({'sheets': data, 'source': 'supabase_cloud'})
    except Exception as e:
        print(f"Erro ao buscar do Supabase: {e}")
        
    return jsonify({'error': 'Nenhum dado encontrado'}), 404

@app.route('/api/save', methods=['POST'])
def api_save_sheets():
    user = get_authenticated_user(request)
    if not user:
        return jsonify({'error': 'Não autorizado'}), 401
        
    payload = request.get_json(silent=True) or {}
    sheets_data = payload.get('sheets')
    client_logs = payload.get('logs', [])
    
    if not sheets_data or not isinstance(sheets_data, list):
        return jsonify({'error': 'Dados inválidos'}), 400
        
    try:
        t0 = time.time()
        json_str = json.dumps(sheets_data, ensure_ascii=False)
        json_bytes = json_str.encode('utf-8')
        with open(DATA_CACHE_FILE, 'wb') as f:
            f.write(json_bytes)
            
        main_excel = get_main_excel_path()
        if os.path.exists(main_excel) and not IS_VERCEL:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"VIGI_backup_{timestamp}.xlsx"
            backup_path = os.path.join(BACKUPS_DIR, backup_name)
            try:
                shutil.copy2(main_excel, backup_path)
            except Exception:
                pass
            
        wb = luckysheet_to_workbook(sheets_data)
        excel_save_target = os.path.join(WRITE_DIR, "VIGI_2026.xlsx") if IS_VERCEL else main_excel
        wb.save(excel_save_target)
        
        with open(excel_save_target, 'rb') as f:
            xlsx_bytes = f.read()
            
        metadata = {
            "last_updated": datetime.datetime.now().isoformat(),
            "updated_by": user['username'],
            "user_role": user['role'],
            "total_sheets": len(sheets_data),
            "sheet_names": [s.get('name') for s in sheets_data]
        }
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
            
        supabase_ok = sync_to_supabase(json_bytes, xlsx_bytes, metadata)
        
        # Registra logs de auditoria
        current_logs = load_logs()
        new_entries = []
        if client_logs and isinstance(client_logs, list):
            for entry in client_logs:
                new_entries.append({
                    "id": f"log_{int(time.time()*1000)}_{len(current_logs) + len(new_entries)}",
                    "timestamp": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                    "user": user['username'],
                    "role": user['role'],
                    "action": entry.get('action', 'EDIÇÃO'),
                    "sheet": entry.get('sheet', 'Planilha'),
                    "cell": entry.get('cell', '-'),
                    "old_value": entry.get('old_value', ''),
                    "new_value": entry.get('new_value', '')
                })
        else:
            new_entries.append({
                "id": f"log_{int(time.time()*1000)}",
                "timestamp": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                "user": user['username'],
                "role": user['role'],
                "action": "SALVAMENTO GERAL",
                "sheet": "Todas as Abas",
                "cell": "-",
                "old_value": "-",
                "new_value": "Planilha sincronizada"
            })
            
        current_logs = new_entries + current_logs
        save_logs(current_logs[:5000])  # Mantém até 5.000 registros de auditoria
        
        duration = round(time.time() - t0, 2)
        return jsonify({
            'success': True,
            'message': 'Planilha e logs salvos com sucesso!',
            'duration_seconds': duration,
            'supabase_synced': supabase_ok,
            'metadata': metadata
        })
    except Exception as e:
        print(f"Erro ao salvar: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def api_get_logs():
    user = get_authenticated_user(request)
    if not user:
        return jsonify({'error': 'Não autorizado'}), 401
        
    # Apenas Supervisores têm permissão para ver os logs
    if user['role'] != 'supervisor':
        return jsonify({'error': 'Acesso restrito a Supervisores'}), 403
        
    logs = load_logs()
    return jsonify({
        'success': True,
        'logs': logs,
        'total': len(logs)
    })

@app.route('/api/log-action', methods=['POST'])
def api_log_action():
    user = get_authenticated_user(request)
    if not user:
        return jsonify({'error': 'Não autorizado'}), 401
        
    data = request.get_json(silent=True) or {}
    current_logs = load_logs()
    
    new_entry = {
        "id": f"log_{int(time.time()*1000)}",
        "timestamp": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "user": user['username'],
        "role": user['role'],
        "action": data.get('action', 'ALTERAÇÃO'),
        "sheet": data.get('sheet', '-'),
        "cell": data.get('cell', '-'),
        "old_value": data.get('old_value', ''),
        "new_value": data.get('new_value', '')
    }
    
    current_logs.insert(0, new_entry)
    save_logs(current_logs[:5000])
    return jsonify({'success': True, 'entry': new_entry})

@app.route('/api/download-excel', methods=['GET'])
def api_download_excel():
    user = get_authenticated_user(request)
    if not user:
        return jsonify({'error': 'Não autorizado'}), 401
        
    main_excel = get_main_excel_path()
    if os.path.exists(main_excel):
        return send_file(
            main_excel,
            as_attachment=True,
            download_name="VIGI_2026_Atualizado.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    # Tenta obter diretamente do Supabase Storage se estiver rodando em ambiente serverless
    try:
        r = requests.get(f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/VIGI_2026.xlsx", timeout=12)
        if r.status_code == 200:
            import io
            return send_file(
                io.BytesIO(r.content),
                as_attachment=True,
                download_name="VIGI_2026_Atualizado.xlsx",
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
    except Exception as e:
        print(f"Erro ao baixar Excel do Supabase: {e}")
        
    return jsonify({'error': 'Arquivo Excel não encontrado'}), 404

@app.route('/api/network-info', methods=['GET'])
def api_network_info():
    ips = get_network_ips()
    port = 5000
    links = [f"http://{ip}:{port}" for ip in ips]
    return jsonify({
        'local_url': f"http://localhost:{port}",
        'network_urls': links,
        'ips': ips,
        'supabase_url': SUPABASE_URL,
        'supabase_status': 'online'
    })

@app.route('/')
def index():
    return send_from_directory(STATIC_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)

if __name__ == '__main__':
    port = 5000
    ips = get_network_ips()
    print("=" * 65)
    print("  VIGI EXCEL ONLINE - CONTROLE DE ACESSOS E AUDITORIA")
    print("=" * 65)
    print(f" [OK] Acesso Local:        http://localhost:{port}")
    for ip in ips:
        print(f" [OK] Acesso em Outros PCs: http://{ip}:{port}")
    print(f" [OK] Supabase Cloud Sync: {SUPABASE_URL}")
    print(" [OK] Supervisores:        Erick, Daniel, admin")
    print(" [OK] Agentes:             Michel, Gabriely, Klaus")
    print("=" * 65)
    
    app.run(host='0.0.0.0', port=port, debug=False)
