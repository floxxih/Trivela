//! # Trivela Campaign Contract
//!
//! On-chain campaign metadata and eligibility for Trivela.
//! Stores campaign config and allows checking participant status.

#![no_std]

use soroban_sdk::{contract, contractimpl, contractmeta, contracterror, symbol_short, Env, Symbol};

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 100,
    OutsideTimeWindow = 101,
}

contractmeta!(
    key = "Description",
    val = "Trivela campaign configuration"
);

const ADMIN: Symbol = symbol_short!("admin");
const CAMPAIGN_ACTIVE: Symbol = symbol_short!("active");
const PARTICIPANT: Symbol = symbol_short!("partic");
const START_TIME: Symbol = symbol_short!("start");
const END_TIME: Symbol = symbol_short!("end");

#[contract]
pub struct CampaignContract;

#[contractimpl]
impl CampaignContract {
    /// Initialize campaign contract with an admin.
    pub fn initialize(env: Env, admin: soroban_sdk::Address) -> Result<(), Error> {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&CAMPAIGN_ACTIVE, &true);
        env.storage().instance().set(&START_TIME, &0u64);
        env.storage().instance().set(&END_TIME, &u64::MAX);
        Ok(())
    }

    /// Set registration time window (admin only).
    pub fn set_window(
        env: Env,
        admin: soroban_sdk::Address,
        start: u64,
        end: u64,
    ) -> Result<(), Error> {
        admin.require_auth();
        let stored: soroban_sdk::Address = env.storage().instance().get(&ADMIN).unwrap();
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&START_TIME, &start);
        env.storage().instance().set(&END_TIME, &end);
        Ok(())
    }

    /// Set campaign active flag (admin only).
    pub fn set_active(env: Env, admin: soroban_sdk::Address, active: bool) -> Result<(), Error> {
        admin.require_auth();
        let stored: soroban_sdk::Address = env.storage().instance().get(&ADMIN).unwrap();
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&CAMPAIGN_ACTIVE, &active);
        Ok(())
    }

    /// Register a participant (authorized caller).
    pub fn register(env: Env, participant: soroban_sdk::Address) -> Result<bool, Error> {
        participant.require_auth();

        let now = env.ledger().timestamp();
        let start: u64 = env.storage().instance().get(&START_TIME).unwrap_or(0);
        let end: u64 = env.storage().instance().get(&END_TIME).unwrap_or(u64::MAX);

        if now < start || now > end {
            return Err(Error::OutsideTimeWindow);
        }

        let key = (PARTICIPANT, participant.clone());
        if env.storage().instance().get::<_, bool>(&key).unwrap_or(false) {
            return Ok(false);
        }
        env.storage().instance().set(&key, &true);
        env.storage().instance().extend_ttl(50, 100);
        Ok(true)
    }

    /// Check if a participant is registered.
    pub fn is_participant(env: Env, participant: soroban_sdk::Address) -> bool {
        env.storage()
            .instance()
            .get(&(PARTICIPANT, participant))
            .unwrap_or(false)
    }

    /// Check if campaign is active.
    pub fn is_active(env: Env) -> bool {
        env.storage().instance().get(&CAMPAIGN_ACTIVE).unwrap_or(false)
    }
}

#[cfg(test)]
mod test;
