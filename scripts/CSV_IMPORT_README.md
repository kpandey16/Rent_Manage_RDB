# CSV Data Import Guide

This guide explains how to import your existing tenant, room, and allocation data from CSV files into the Rent Management database.

## Prerequisites

1. Python 3.7 or higher installed
2. Your CSV files prepared in the correct format
3. Access to your Turso database credentials (.env file configured)

## Step 1: Install Dependencies

```bash
# Navigate to the scripts directory
cd scripts

# Install required Python packages
pip install -r requirements_import.txt
```

## Step 2: Prepare Your CSV Files

Create three CSV files with the following formats:

### 1. `tenants.csv`
```csv
tenant_name,mobile,security_deposit
Rajesh Kumar,9876543210,10000
Priya Sharma,9876543211,15000
```

**Columns:**
- `tenant_name`: Full name of the tenant
- `mobile`: 10-digit mobile number
- `security_deposit`: Security deposit amount in ₹

### 2. `rooms.csv`
```csv
room_number,description,rent
101,Ground Floor Room,5000
102,Ground Floor Room,5000
201,First Floor Room,6000
```

**Columns:**
- `room_number`: Room identifier (e.g., 101, 201, A1)
- `description`: Room description or floor/location details
- `rent`: Monthly rent amount in ₹

### 3. `allocations.csv`
```csv
tenant_name,room_number,allocation_month
Rajesh Kumar,101,Jan-2024
Priya Sharma,201,Feb-2024
```

**Columns:**
- `tenant_name`: Must match exactly with name in tenants.csv
- `room_number`: Must match exactly with room_number in rooms.csv
- `allocation_month`: Format: `MMM-YYYY` (e.g., Jan-2024, Feb-2024)

**Supported month formats:**
- `Jan-2024`, `Feb-2024`, etc. (3-letter abbreviation)
- `January-2024`, `February-2024`, etc. (full month name)

## Step 3: Place CSV Files

Place your three CSV files in the **project root directory**:
```
Rent_Manage_RDB/
├── tenants.csv
├── rooms.csv
├── allocations.csv
└── scripts/
    └── import_csv_data.py
```

**OR** if you're in the scripts directory, place them there:
```
scripts/
├── tenants.csv
├── rooms.csv
├── allocations.csv
└── import_csv_data.py
```

## Step 4: Run the Import Script

```bash
# From project root
python scripts/import_csv_data.py

# OR from scripts directory
cd scripts
python import_csv_data.py
```

## What the Script Does

1. **Imports Tenants:**
   - Creates tenant records in the database
   - Creates security deposit entries if deposit > 0
   - Sets all tenants as active

2. **Imports Rooms:**
   - Creates room records with rent information
   - Initially marks all rooms as 'vacant'

3. **Imports Allocations:**
   - Links tenants to rooms
   - Sets move-in date from allocation_month
   - Updates room status to 'occupied'
   - Marks allocations as active

## Sample Output

```
============================================================
🚀 Starting CSV Data Import
============================================================

📋 Importing tenants from tenants.csv...
  ✅ Added tenant: Rajesh Kumar (Phone: 9876543210, Deposit: ₹10000)
  ✅ Added tenant: Priya Sharma (Phone: 9876543211, Deposit: ₹15000)
✅ Successfully imported 2 tenants

📋 Importing rooms from rooms.csv...
  ✅ Added room: 101 (Ground Floor Room) - ₹5000/month
  ✅ Added room: 201 (First Floor Room) - ₹6000/month
✅ Successfully imported 2 rooms

📋 Importing allocations from allocations.csv...
  ✅ Allocated room 101 to Rajesh Kumar (from Jan-2024)
  ✅ Allocated room 201 to Priya Sharma (from Feb-2024)
✅ Successfully imported 2 allocations

============================================================
✅ Import completed successfully!
============================================================
📊 Summary:
   - Tenants imported: 2
   - Rooms imported: 2

💡 Next steps:
   1. Verify data in the application
   2. Run any pending migrations: node scripts/add-document-id.js
   3. Start recording payments for allocated tenants
```

## Troubleshooting

### Error: File not found
- Ensure CSV files are in the correct directory (project root or scripts folder)
- Check file names exactly match: `tenants.csv`, `rooms.csv`, `allocations.csv`

### Error: Tenant/Room not found during allocation
- Ensure names and room numbers in allocations.csv match exactly with tenants.csv and rooms.csv
- Check for extra spaces or different spelling

### Error: Database connection failed
- Verify your `.env` file has correct Turso credentials
- Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set

### Date parsing warnings
- Use format: `MMM-YYYY` (Jan-2024, Feb-2024, etc.)
- Supported: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
- Also supports full names: January, February, etc.

## After Import

1. **Verify in Application:**
   - Open the web app and check Tenants page
   - Verify Rooms page shows correct status
   - Check tenant details show correct allocations

2. **Run Migrations:**
   ```bash
   node scripts/add-document-id.js
   ```

3. **Start Using:**
   - Record opening balances if needed
   - Start recording monthly payments
   - Generate reports

## Sample Files

Sample CSV files are provided:
- `sample_tenants.csv`
- `sample_rooms.csv`
- `sample_allocations.csv`

You can use these as templates for your own data.

## Notes

- **No duplicate checking:** The script doesn't check for duplicates. Make sure your CSV files don't have duplicate entries.
- **Idempotency:** Running the script multiple times will create duplicate records. Only run once per import.
- **Backup:** Make a backup of your database before running imports on production.
- **Testing:** Test with sample data first before importing real data.

## Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify CSV file formats match the templates
3. Ensure database credentials are correct
4. Check that all files are in the correct location
