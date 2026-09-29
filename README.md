# 📊 VIGI Excel Online - Gestão de Planilhas e Clientes

Uma réplica completa e moderna do **Google Planilhas / Microsoft Excel Online**, com **Tema Escuro & Filtro de Conforto Visual**, **Menu em Português**, **Controle de Acesso por Níveis (Supervisores & Agentes)**, **Auditoria de Alterações (Logs)**, **Fórmulas Ativas** e sincronização 100% segura e isolada no **Supabase**.

---

## 👥 Usuários e Permissões Cadastrados

| Usuário | Senha | Nível | Permissões |
| :--- | :--- | :--- | :--- |
| **`Erick`** | `324354` | 🛡️ **Supervisor** | Acesso total + **Auditoria & Logs de Alterações** |
| **`Daniel`** | `Margot` | 🛡️ **Supervisor** | Acesso total + **Auditoria & Logs de Alterações** |
| **`Michel`** | `Clic@3369` | 👤 **Agente** | Edição de planilhas (todas alterações são registradas) |
| **`Gabriely`** | `Clic@3369` | 👤 **Agente** | Edição de planilhas (todas alterações são registradas) |
| **`Klaus`** | `Clic@3369` | 👤 **Agente** | Edição de planilhas (todas alterações são registradas) |
| **`admin`** | `Clic@3369` | 🛡️ **Supervisor** | Administrador Geral |

---

## 📋 Sistema de Auditoria & Logs de Alterações (Erick & Daniel)

* **Rastreamento Automático:** Sempre que um funcionário (Agente ou Supervisor) alterar uma célula, redimensionar uma coluna, inserir ou excluir uma linha, o sistema registra automaticamente:
  * **Data e Hora exata**
  * **Nome do Funcionário e Cargo**
  * **Aba da Planilha** (ex: `CLIENTES VIGI HIK`, `PREF. BANDEIRANTE`)
  * **Célula ou Linha afetada** (ex: `B12` ou `Largura da Coluna`)
  * **Valor Anterior** (riscado em vermelho)
  * **Novo Valor** (destacado em verde)
* **Acesso Restrito:** Apenas os Supervisores (**Erick** e **Daniel**) conseguem visualizar o botão **"Logs de Alterações"**. Para os agentes, esse botão fica oculto e protegido contra acesso não autorizado (HTTP 403).
* **Filtros e Exportação:** O modal permite filtrar por funcionário, por aba, pesquisar termos e exportar o relatório de auditoria completo em formato `.csv`!

---

## 🌙 Tema Escuro & Filtro de Conforto Visual

* Alternância rápida no botão de Lua/Sol no topo.
* **Filtro Anti-Fadiga Ocular:** Reduz o brilho ofuscante para descanso visual em longas jornadas, mantendo fluidez máxima e zero engasgo na troca de abas.
* **Menu do Botão Direito 100% Adaptado:** Texto nítido em branco e verde com atalhos alinhados à direita no tema escuro.

---

## ☁️ Isolamento Total no Supabase

* **Zero Conflito:** Nenhuma tabela existente no banco do Supabase foi tocada ou alterada (`demands`, `compras`, `profiles`, etc. permanecem 100% intactas).
* **Espaço Exclusivo:** Todo o armazenamento deste sistema fica no bucket de Storage:
  * `vigi_spreadsheets/sheet_data.json` *(Planilhas, células e fórmulas)*
  * `vigi_spreadsheets/VIGI_2026.xlsx` *(Arquivo Excel compilado)*
  * `vigi_spreadsheets/change_logs.json` *(Histórico de auditoria)*
  * `vigi_spreadsheets/metadata.json` *(Metadados e últimas atualizações)*

---

## 🚀 Como Publicar na Vercel (Passo a Passo)

1. **Suba este projeto para o GitHub**:
   * Crie um repositório no seu GitHub (ex: `vigi-excel-online`).
   * Envie todos os arquivos desta pasta para o repositório.
2. **Importe o projeto na Vercel**:
   * Acesse [vercel.com](https://vercel.com) e clique em **Add New... -> Project**.
   * Selecione o repositório do GitHub.
3. **Configure as Variáveis de Ambiente (Environment Variables)**:
   Adicione as 4 variáveis do arquivo `.env`:
   * `SUPABASE_URL` = `https://hnfhrjgzeivzrcpumkyk.supabase.co`
   * `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZmhyamd6ZWl2enJjcHVta3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg5MTQsImV4cCI6MjA4ODMwNDkxNH0.qWKErHq6vCPRWdDfrnngY8fPiJ05VR586U0GzZ3vmrI`
   * `SUPABASE_SERVICE_ROLE` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZmhyamd6ZWl2enJjcHVta3lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcyODkxNCwiZXhwIjoyMDg4MzA0OTE0fQ.lG8gV39uSSStfgbSUnBJkGogYdn-zYh3ffUdsjj_xWE`
   * `SUPABASE_BUCKET` = `vigi_spreadsheets`
   * `SECRET_KEY` = `vigi-super-secret-key-excel-2026-audit`
4. **Deploy**:
   * Clique em **Deploy**. A Vercel gerará automaticamente um link seguro (`https://seu-projeto.vercel.app`) para você e sua equipe acessarem de qualquer lugar do mundo!
