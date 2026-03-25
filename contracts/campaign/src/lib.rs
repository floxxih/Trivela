//! # Trivela Campaign Contract
//!
//! On-chain campaign metadata and eligibility for Trivela.
//! Stores campaign config and allows checking participant status.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contractmeta, symbol_short, Env, Symbol};

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 100,
    OutsideTimeWindow = 101,
    CapacityReached = 102,
    CampaignInactive = 102,
}

contractmeta!(key = "Description", val = "Trivela campaign configuration");

const ADMIN: Symbol = symbol_short!("admin");
const CAMPAIGN_ACTIVE: Symbol = symbol_short!("active");
const PARTICIPANT: Symbol = symbol_short!("partic");
const START_TIME: Symbol = symbol_short!("start");
const END_TIME: Symbol = symbol_short!("end");
const MAX_CAP: Symbol = symbol_short!("maxcap");
const PARTICIPANT_COUNT: Symbol = symbol_short!("count");

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
        env.storage().instance().set(&PARTICIPANT_COUNT, &0u64);
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

    /// Set maximum participant cap (admin only). Set to 0 for unlimited.
    pub fn set_max_cap(env: Env, admin: soroban_sdk::Address, max_cap: u64) -> Result<(), Error> {
        admin.require_auth();
        let stored: soroban_sdk::Address = env.storage().instance().get(&ADMIN).unwrap();
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&MAX_CAP, &max_cap);
        Ok(())
    }

    /// Register a participant (authorized caller).
    pub fn register(env: Env, participant: soroban_sdk::Address) -> Result<bool, Error> {
        participant.require_auth();

        // Check if campaign is active
        let active: bool = env.storage().instance().get(&CAMPAIGN_ACTIVE).unwrap_or(false);
        if !active {
            return Err(Error::CampaignInactive);
        }

        let now = env.ledger().timestamp();
        let start: u64 = env.storage().instance().get(&START_TIME).unwrap_or(0);
        let end: u64 = env.storage().instance().get(&END_TIME).unwrap_or(u64::MAX);

        if now < start || now > end {
            return Err(Error::OutsideTimeWindow);
        }

        let key = (PARTICIPANT, participant.clone());
        if env
            .storage()
            .instance()
            .get::<_, bool>(&key)
            .unwrap_or(false)
        {
            return Ok(false);
        }

        // Check capacity if max_cap is set
        let max_cap: u64 = env.storage().instance().get(&MAX_CAP).unwrap_or(0);
        if max_cap > 0 {
            let count: u64 = env
                .storage()
                .instance()
                .get(&PARTICIPANT_COUNT)
                .unwrap_or(0);
            if count >= max_cap {
                return Err(Error::CapacityReached);
            }
        }

        env.storage().instance().set(&key, &true);

        // Increment participant count
        let count: u64 = env
            .storage()
            .instance()
            .get(&PARTICIPANT_COUNT)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&PARTICIPANT_COUNT, &(count + 1));

        env.storage().instance().extend_ttl(50, 100);
        Ok(true)
    }

        let key = (PARTICIPANT, participant.clone());
        if env
            .storage()
            .instance()
            .get::<_, bool>(&key)
            .unwrap_or(false)
        {
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
        env.storage()
            .instance()
            .get(&CAMPAIGN_ACTIVE)
            .unwrap_or(false)
    }

    /// Get current participant count.
    pub fn get_participant_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&PARTICIPANT_COUNT)
            .unwrap_or(0)
    }

    /// Get maximum participant cap (0 means unlimited).
    pub fn get_max_cap(env: Env) -> u64 {
        env.storage().instance().get(&MAX_CAP).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
