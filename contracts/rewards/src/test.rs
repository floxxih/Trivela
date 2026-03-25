//! Tests for the Trivela rewards contract.

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Address;

#[test]
fn test_balance_empty() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardsContract);
    let client = RewardsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(
        &admin,
        &symbol_short!("Trivela"),
        &symbol_short!("TVL"),
    );
    let balance = client.balance(&user);
    assert_eq!(balance, 0);
}

#[test]
fn test_credit_and_balance() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardsContract);
    let client = RewardsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(
        &admin,
        &symbol_short!("Trivela"),
        &symbol_short!("TVL"),
    );
    env.mock_all_auths();
    let new_balance = client.credit(&admin, &user, &100);
    assert_eq!(new_balance, 100);
    assert_eq!(client.balance(&user), 100);
}

#[test]
fn test_metadata() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardsContract);
    let client = RewardsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let name = symbol_short!("MyReward");
    let symbol = symbol_short!("REW");
    client.initialize(&admin, &name, &symbol);

    let metadata = client.metadata();
    assert_eq!(metadata.0, name);
    assert_eq!(metadata.1, symbol);
}

#[test]
fn test_claim_more_than_balance_errors() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardsContract);
    let client = RewardsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(
        &admin,
        &symbol_short!("Trivela"),
        &symbol_short!("TVL"),
    );

    env.mock_all_auths();
    let result = client.try_claim(&user, &1);
    assert!(result.is_err());
    assert_eq!(client.balance(&user), 0);
}

#[test]
fn test_credit_overflow_errors() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardsContract);
    let client = RewardsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(
        &admin,
        &symbol_short!("Trivela"),
        &symbol_short!("TVL"),
    );

    env.mock_all_auths();
    client.credit(&admin, &user, &u64::MAX);

    let result = client.try_credit(&admin, &user, &1);
    assert!(result.is_err());
    assert_eq!(client.balance(&user), u64::MAX);
}

#[test]
fn test_uninitialized_access_returns_defaults() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardsContract);
    let client = RewardsContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    assert_eq!(client.metadata(), (symbol_short!("Trivela"), symbol_short!("TVL")));
    assert_eq!(client.balance(&user), 0);
    assert_eq!(client.total_claimed(), 0);
}
