Ajuste o código do aplicativo para que ele siga rigorosamente a estrutura atual do meu banco de dados Supabase. Não tente usar nomes de colunas diferentes dos listados abaixo:

1. Mapeamento de Tabelas:

Tabela credits: Use valueReceived para o valor inicial, valueAvailable para o saldo atual e valueUsed para o total gasto. Use id, nc, description e created_at.

Tabela commitments: Use creditId (com 'I' maiúsculo) para vincular ao crédito. Use value para o valor do empenho.

Tabela cancellations: Use commitmentId e value.

Tabela users: Use id, username, password, role e name.

2. Correções Necessárias:

Cálculos de Saldo: O valueAvailable de um crédito deve ser calculado como: valueReceived minus (soma de value de todos os commitments vinculados) plus (soma de value de todos os cancellations vinculados).

Percentuais: Corrija o cálculo de utilização para: (valueUsed / valueReceived) * 100. Se valueReceived for zero, retorne 0%.

Cadastro de Crédito: Ao salvar um novo crédito, envie os dados para valueReceived, valueTotal e valueAvailable usando o valor digitado pelo usuário. Nunca tente enviar para 'value_received'.

3. Estabilidade:

Certifique-se de que todas as listagens de Créditos e Empenhos busquem os dados usando esses nomes exatos. Se algum valor estiver aparecendo zerado, é porque o mapeamento de nomes de colunas está errado. Corrija-o agora.
