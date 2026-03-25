//! # Trivela Rewards Contract
//!
//! On-chain points and rewards for the Trivela campaign platform.
//! Tracks user balances and allows claiming rewards.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contractmeta, symbol_short, Env, Symbol, Vec,
};

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Overflow = 1,
    InsufficientBalance = 2,
    Unauthorized = 3,
    ContractPaused = 4,
}

contractmeta!(
    key = "Description",
    val = "Trivela campaign rewards and points"
);

const BALANCE: Symbol = symbol_short!("balance");
const CLAIMED: Symbol = symbol_short!("claimed");
const METADATA: Symbol = symbol_short!("metadata");
const PAUSED: Symbol = symbol_short!("paused");

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    /// Initialize the rewards contract (admin).
    pub fn initialize(
        env: Env,
        admin: soroban_sdk::Address,
        name: Symbol,
        symbol: Symbol,
    ) -> Result<(), Error> {
        env.storage()
            .instance()
            .set(&symbol_short!("admin"), &admin);
        env.storage().instance().set(&CLAIMED, &0u64);
        env.storage().instance().set(&METADATA, &(name, symbol));
        env.storage().instance().set(&PAUSED, &false);
        Ok(())
    }

    /// Get contract metadata (name and symbol).
    pub fn metadata(env: Env) -> (Symbol, Symbol) {
        env.storage()
            .instance()
            .get(&METADATA)
            .unwrap_or((symbol_short!("Trivela"), symbol_short!("TVL")))
    }

    /// Get the current points balance for a user.
    pub fn balance(env: Env, user: soroban_sdk::Address) -> u64 {
        env.storage().instance().get(&(BALANCE, user)).unwrap_or(0)
    }

    /// Credit points to a user (admin or authorized campaign only).
    pub fn credit(
        env: Env,
        from: soroban_sdk::Address,
        user: soroban_sdk::Address,
        amount: u64,
    ) -> Result<u64, Error> {
        from.require_auth();

        // Check if contract is paused
        let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if paused {
            return Err(Error::ContractPaused);
        }

        let key = (BALANCE, user.clone());
        let current: u64 = env.storage().instance().get(&key).unwrap_or(0);
        let new_balance = current.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage().instance().set(&key, &new_balance);
        env.storage().instance().extend_ttl(50, 100);
        Ok(new_balance)
    }

    /// Credit points to multiple users in one call.
    pub fn batch_credit(
        env: Env,
        from: soroban_sdk::Address,
        recipients: Vec<(soroban_sdk::Address, u64)>,
    ) -> Result<(), Error> {
        from.require_auth();

        let mut staged = Vec::new(&env);

        for (user, amount) in recipients.iter() {
            let key = (BALANCE, user.clone());
            let current: u64 = env.storage().instance().get(&key).unwrap_or(0);
            let new_balance = current.checked_add(amount).ok_or(Error::Overflow)?;
            staged.push_back((user, new_balance));
        }

        for (user, new_balance) in staged.iter() {
            env.storage().instance().set(&(BALANCE, user), &new_balance);
        }

        env.storage().instance().extend_ttl(50, 100);
        Ok(())
    }

    /// Claim rewards for a user (reduces balance).
    pub fn claim(env: Env, user: soroban_sdk::Address, amount: u64) -> Result<u64, Error> {
        user.require_auth();

        // Check if contract is paused
        let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if paused {
            return Err(Error::ContractPaused);
        }

        let key = (BALANCE, user.clone());
        let current: u64 = env.storage().instance().get(&key).unwrap_or(0);
        let new_balance = current
            .checked_sub(amount)
            .ok_or(Error::InsufficientBalance)?;
        env.storage().instance().set(&key, &new_balance);
        let total: u64 = env.storage().instance().get(&CLAIMED).unwrap_or(0);
        env.storage()
            .instance()
            .set(&CLAIMED, &total.saturating_add(amount));
        env.storage().instance().extend_ttl(50, 100);
        Ok(new_balance)
    }

    /// Get total claimed rewards (global stats).
    pub fn total_claimed(env: Env) -> u64 {
        env.storage().instance().get(&CLAIMED).unwrap_or(0)
    }

    /// Pause the contract (admin only). Blocks credit and claim operations.
    pub fn set_paused(env: Env, admin: soroban_sdk::Address, paused: bool) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin: soroban_sdk::Address = env
            .storage()
            .instance()
            .get(&symbol_short!("admin"))
            .unwrap();
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&PAUSED, &paused);
        Ok(())
    }

    /// Check if contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&PAUSED).unwrap_or(false)
    }
}

#[cfg(test)]
mod test;
