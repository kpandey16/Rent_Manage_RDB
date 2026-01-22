-- Migration: Add lawn events management tables
-- This adds support for tracking marriage lawn event bookings and withdrawals

-- Create lawn_events table
CREATE TABLE IF NOT EXISTS lawn_events (
  id TEXT PRIMARY KEY,
  event_date TEXT NOT NULL,
  booking_amount REAL NOT NULL CHECK (booking_amount > 0),
  customer_name TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

-- Create index on event_date
CREATE INDEX IF NOT EXISTS idx_lawn_events_date
ON lawn_events(event_date DESC);

-- Create lawn_withdrawals table
CREATE TABLE IF NOT EXISTS lawn_withdrawals (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL CHECK (amount > 0),
  withdrawal_date TEXT NOT NULL,
  withdrawn_by TEXT NOT NULL,
  withdrawal_method TEXT CHECK (withdrawal_method IN ('cash', 'bank_transfer', 'upi')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index on withdrawal_date
CREATE INDEX IF NOT EXISTS idx_lawn_withdrawals_date
ON lawn_withdrawals(withdrawal_date DESC);

-- Create lawn_settings table for opening balance and other settings
CREATE TABLE IF NOT EXISTS lawn_settings (
  key TEXT PRIMARY KEY,
  value REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default opening balance if not exists
INSERT OR IGNORE INTO lawn_settings (key, value, updated_at)
VALUES ('opening_balance', 0, datetime('now'));
