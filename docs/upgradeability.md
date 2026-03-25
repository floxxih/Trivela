# Soroban Contract Upgradeability

Trivela contracts are designed with a standard Soroban upgradeability pattern, allowing for logic updates while preserving contract address and state.

## Upgrade Pattern

Soroban provides a built-in mechanism for upgrading contract code. This is achieved by updating the Wasm byte-code associated with a contract ID.

### 1. Requirements
- The contract must implement an admin-only function that calls `env.deployer().update_current_contract_wasm(new_wasm_hash)`.
- The new WASM file must already be uploaded to the network (obtaining a `wasm_hash`).

### 2. Implementation Example

In a future iteration, we can add this to `RewardsContract`:

```rust
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
    admin.require_auth();
    // Verify admin matches stored admin
    env.deployer().update_current_contract_wasm(new_wasm_hash);
}
```

### 3. Migration Steps
- **State Compatibility**: Ensure the new contract version can correctly interpret the existing instance and persistent storage.
- **WASM Upload**: Use `stellar contract install --wasm <file>` to upload the new code and get the hash.
- **Invoke Upgrade**: Call the `upgrade` function with the admin identity.

## Future: Managed Upgradeability
For more complex scenarios, a **Proxy Pattern** or a **Factory pattern** can be used to manage multiple contract instances and their upgrades centrally.
