//! Tests for the Trivela campaign contract.

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::Address;

#[test]
fn test_initialize_and_active() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    assert!(client.is_active());
}

#[test]
fn test_register_participant() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let participant = Address::generate(&env);
    client.initialize(&admin);
    env.mock_all_auths();
    let registered = client.register(&participant);
    assert!(registered);
    assert!(client.is_participant(&participant));
}

#[test]
fn test_time_window_validation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let participant = Address::generate(&env);
    client.initialize(&admin);

    // Set window: 100 to 200
    env.mock_all_auths();
    client.set_window(&admin, &100, &200);

    // Case 1: Too early (mock time 50)
    env.ledger().with_mut(|li| li.timestamp = 50);
    let result = client.try_register(&participant);
    assert!(result.is_err());

    // Case 2: Within window (mock time 150)
    env.ledger().with_mut(|li| li.timestamp = 150);
    let registered = client.register(&participant);
    assert!(registered);

    // Case 3: Too late (mock time 250)
    let participant2 = Address::generate(&env);
    env.ledger().with_mut(|li| li.timestamp = 250);
    let result = client.try_register(&participant2);
    assert!(result.is_err());
}

#[test]
fn test_register_participant_twice_returns_false() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let participant = Address::generate(&env);
    client.initialize(&admin);

    env.mock_all_auths();
    assert!(client.register(&participant));
    assert!(!client.register(&participant));
}

#[test]
fn test_set_active_only_by_admin() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let other = Address::generate(&env);
    client.initialize(&admin);

    env.mock_all_auths();
    let result = client.try_set_active(&other, &false);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_register_when_inactive() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let participant = Address::generate(&env);
    client.initialize(&admin);

    env.mock_all_auths();
    client.set_active(&admin, &false);

    let result = client.try_register(&participant);
    assert_eq!(result, Err(Ok(Error::CampaignInactive)));
}

#[test]
fn test_is_participant_for_unknown_address() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CampaignContract);
    let client = CampaignContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let unknown = Address::generate(&env);
    client.initialize(&admin);

    assert!(!client.is_participant(&unknown));
}
