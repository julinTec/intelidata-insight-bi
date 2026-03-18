

## Plano: Definir Admin e Desbloquear Acesso

### Problema
Não existe nenhum registro de admin na tabela `user_roles`. A migration anterior tentou inserir com o email `julio.cezar@redebloom.com.br`, mas esse email não existe no sistema. Sua conta real é `juliocezarestudos35@gmail.com` (id: `be18eb87-f687-438a-8ec7-246e856e2fbf`).

### Solução

**1. Inserir role admin no banco** (via insert tool)
```sql
UPDATE user_roles SET role = 'admin' WHERE user_id = 'be18eb87-f687-438a-8ec7-246e856e2fbf';
-- Ou inserir novo registro se necessário:
INSERT INTO user_roles (user_id, role) VALUES ('be18eb87-f687-438a-8ec7-246e856e2fbf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**2. Atualizar perfil para refletir status admin** (via insert tool)
```sql
UPDATE profiles SET subscription_status = 'admin', is_paid = true WHERE id = 'be18eb87-f687-438a-8ec7-246e856e2fbf';
```

Isso é suficiente — o código já verifica `isAdmin` via `useRole` (que consulta `user_roles`) e o `useSubscription` já dá `hasAccess = true` para admins. Nenhuma alteração de código necessária.

### Arquivos modificados
Nenhum arquivo de código — apenas dados no banco.

