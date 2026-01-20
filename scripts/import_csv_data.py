"""
CSV Data Import Script for Rent Management System

This script imports tenant, room, and allocation data from CSV files into the Turso database.

CSV File Formats Required:
1. tenants.csv: tenant_name, mobile, security_deposit
2. rooms.csv: room_number, description, rent
3. allocations.csv: tenant_name, room_number, allocation_month (MMM-YYYY format)

Usage:
    python scripts/import_csv_data.py

Requirements:
    pip install libsql-client pandas python-dotenv
"""

import os
import sys
import pandas as pd
from datetime import datetime
from libsql_client import create_client
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# Connect to Turso database
db = create_client(
    url=os.getenv('TURSO_DATABASE_URL'),
    auth_token=os.getenv('TURSO_AUTH_TOKEN')
)

def generate_id():
    """Generate a unique ID"""
    return str(uuid.uuid4())

def get_current_datetime():
    """Get current datetime in ISO format"""
    return datetime.now().isoformat()

def parse_allocation_month(month_str):
    """
    Parse allocation month from MMM-YYYY format to YYYY-MM-DD
    Example: 'Jan-2024' -> '2024-01-01'
    """
    try:
        dt = datetime.strptime(month_str.strip(), '%b-%Y')
        return dt.strftime('%Y-%m-01')
    except ValueError:
        try:
            # Try full month name
            dt = datetime.strptime(month_str.strip(), '%B-%Y')
            return dt.strftime('%Y-%m-01')
        except ValueError:
            print(f"⚠️  Warning: Could not parse date '{month_str}', using current date")
            return datetime.now().strftime('%Y-%m-01')

def import_tenants(csv_file='tenants.csv'):
    """
    Import tenants from CSV file
    CSV Format: tenant_name, mobile, security_deposit
    """
    print(f"\n📋 Importing tenants from {csv_file}...")

    try:
        df = pd.read_csv(csv_file)
        df.columns = df.columns.str.strip()  # Remove whitespace from column names

        tenant_map = {}  # Map tenant_name -> tenant_id
        now = get_current_datetime()

        for idx, row in df.iterrows():
            tenant_id = generate_id()
            tenant_name = str(row['tenant_name']).strip()
            mobile = str(row['mobile']).strip()
            security_deposit = float(row['security_deposit'])

            # Insert tenant
            db.execute(
                """INSERT INTO tenants (id, name, phone, email, address, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, NULL, NULL, 1, ?, ?)""",
                [tenant_id, tenant_name, mobile, now, now]
            )

            # Insert security deposit if > 0
            if security_deposit > 0:
                deposit_id = generate_id()
                db.execute(
                    """INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, created_at)
                       VALUES (?, ?, 'deposit', ?, ?, ?, ?)""",
                    [deposit_id, tenant_id, security_deposit, now.split('T')[0],
                     f"Initial security deposit for {tenant_name}", now]
                )

            tenant_map[tenant_name] = tenant_id
            print(f"  ✅ Added tenant: {tenant_name} (Phone: {mobile}, Deposit: ₹{security_deposit})")

        print(f"✅ Successfully imported {len(df)} tenants")
        return tenant_map

    except FileNotFoundError:
        print(f"❌ Error: File '{csv_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error importing tenants: {e}")
        sys.exit(1)

def import_rooms(csv_file='rooms.csv'):
    """
    Import rooms from CSV file
    CSV Format: room_number, description, rent
    """
    print(f"\n📋 Importing rooms from {csv_file}...")

    try:
        df = pd.read_csv(csv_file)
        df.columns = df.columns.str.strip()

        room_map = {}  # Map room_number -> room_id
        now = get_current_datetime()

        for idx, row in df.iterrows():
            room_id = generate_id()
            room_number = str(row['room_number']).strip()
            description = str(row['description']).strip() if pd.notna(row['description']) else ''
            rent = float(row['rent'])

            # Insert room (status will be 'vacant' initially, updated during allocation)
            db.execute(
                """INSERT INTO rooms (id, code, name, monthly_rent, status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 'vacant', ?, ?)""",
                [room_id, room_number, description, rent, now, now]
            )

            room_map[room_number] = room_id
            print(f"  ✅ Added room: {room_number} ({description}) - ₹{rent}/month")

        print(f"✅ Successfully imported {len(df)} rooms")
        return room_map

    except FileNotFoundError:
        print(f"❌ Error: File '{csv_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error importing rooms: {e}")
        sys.exit(1)

def import_allocations(csv_file, tenant_map, room_map):
    """
    Import room allocations from CSV file
    CSV Format: tenant_name, room_number, allocation_month (MMM-YYYY)
    """
    print(f"\n📋 Importing allocations from {csv_file}...")

    try:
        df = pd.read_csv(csv_file)
        df.columns = df.columns.str.strip()

        now = get_current_datetime()
        allocation_count = 0

        for idx, row in df.iterrows():
            tenant_name = str(row['tenant_name']).strip()
            room_number = str(row['room_number']).strip()
            allocation_month = str(row['allocation_month']).strip()

            # Get tenant_id and room_id
            tenant_id = tenant_map.get(tenant_name)
            room_id = room_map.get(room_number)

            if not tenant_id:
                print(f"  ⚠️  Warning: Tenant '{tenant_name}' not found, skipping allocation")
                continue

            if not room_id:
                print(f"  ⚠️  Warning: Room '{room_number}' not found, skipping allocation")
                continue

            # Parse allocation month
            move_in_date = parse_allocation_month(allocation_month)

            # Insert allocation
            allocation_id = generate_id()
            db.execute(
                """INSERT INTO tenant_rooms (id, tenant_id, room_id, move_in_date, move_out_date, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, NULL, 1, ?, ?)""",
                [allocation_id, tenant_id, room_id, move_in_date, now, now]
            )

            # Update room status to 'occupied'
            db.execute(
                "UPDATE rooms SET status = 'occupied', updated_at = ? WHERE id = ?",
                [now, room_id]
            )

            allocation_count += 1
            print(f"  ✅ Allocated room {room_number} to {tenant_name} (from {allocation_month})")

        print(f"✅ Successfully imported {allocation_count} allocations")

    except FileNotFoundError:
        print(f"❌ Error: File '{csv_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error importing allocations: {e}")
        sys.exit(1)

def main():
    """Main import function"""
    print("=" * 60)
    print("🚀 Starting CSV Data Import")
    print("=" * 60)

    # Check if CSV files exist
    tenant_file = 'tenants.csv'
    room_file = 'rooms.csv'
    allocation_file = 'allocations.csv'

    missing_files = []
    for file in [tenant_file, room_file, allocation_file]:
        if not os.path.exists(file):
            missing_files.append(file)

    if missing_files:
        print("\n❌ Missing CSV files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease ensure all CSV files are in the current directory:")
        print("   - tenants.csv: tenant_name, mobile, security_deposit")
        print("   - rooms.csv: room_number, description, rent")
        print("   - allocations.csv: tenant_name, room_number, allocation_month")
        sys.exit(1)

    try:
        # Import in order: tenants, rooms, then allocations
        tenant_map = import_tenants(tenant_file)
        room_map = import_rooms(room_file)
        import_allocations(allocation_file, tenant_map, room_map)

        print("\n" + "=" * 60)
        print("✅ Import completed successfully!")
        print("=" * 60)
        print(f"📊 Summary:")
        print(f"   - Tenants imported: {len(tenant_map)}")
        print(f"   - Rooms imported: {len(room_map)}")
        print("\n💡 Next steps:")
        print("   1. Verify data in the application")
        print("   2. Run any pending migrations: node scripts/add-document-id.js")
        print("   3. Start recording payments for allocated tenants")

    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
