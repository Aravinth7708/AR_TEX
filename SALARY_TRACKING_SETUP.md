# Enhanced Labour Profile with Complete Salary History

## What's Been Added

✅ **Complete labour profile information display**:
- Labour name and phone number
- Profile creation date
- All contact details in one place

✅ **Weekly salary history tracking**:
- `labour_salary_history` table stores week-by-week records
- Each week includes: salary, advance, advance paid, net balance
- Unique constraint per labour per week (prevents duplicates)
- Auto-calculated net balance field

✅ **Comprehensive history view**:
- Summary cards showing total records, total salary, total advance
- Full table with all weekly records
- Week period display (e.g., "23 Dec - 29 Dec 2024")
- Color-coded balances (green = positive, red = negative)
- Notes/remarks for each week
- Edit any historical record

✅ **Smart week selection**:
- Calendar-based date picker
- "Current Week" quick button
- "Last Week" quick button
- Auto-calculates week end date (Sunday) from start date (Monday)
- Prevents duplicate entries for same week

✅ **Enhanced UI/UX**:
- Large modal with comprehensive view (max-width: 4xl)
- Scrollable content for long history
- Responsive table layout
- Professional color-coded cards
- Touch-friendly buttons for mobile
- Clear action buttons (Add Week, Edit, Close)

## Database Migrations Required

**IMPORTANT:** You need to run TWO SQL migrations in Supabase:

### Migration 1: Add Salary Tracking Fields (if not done)
1. File: `supabase/migrations/20251227_add_salary_tracking.sql`
2. This adds weekly_salary, weekly_advance, advance_paid to labour_profiles

### Migration 2: Create Salary History Table (NEW - REQUIRED)
1. File: `supabase/migrations/20251227_create_salary_history.sql`
2. This creates the labour_salary_history table with:
   - Week date ranges
   - Salary/advance/paid tracking
   - Auto-calculated net balance
   - Notes field
   - Proper indexes and RLS policies

### Steps to Run Migrations:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor**
4. Run Migration 1 (if not already done):
   - Copy content from `20251227_add_salary_tracking.sql`
   - Paste and click **Run**
5. Run Migration 2 (NEW):
   - Copy content from `20251227_create_salary_history.sql`
   - Paste and click **Run**

## How to Use

### View Complete Labour Profile:
1. Go to **Labour Profile** page
2. Click the **Info icon** (blue ℹ️) on any labour card
3. See comprehensive profile:
   - **Contact Information** card (name, phone, created date)
   - **Summary cards** (total records, total salary, total advance)
   - **Weekly History table** with all past records

### Add New Week Record:
1. Click **Info icon** to open profile
2. Click **Add Week** button (top-right of history table)
3. Fill in the form:
   - **Week Period**: Select start date or use quick buttons
   - **Weekly Salary**: Total salary for the week
   - **Weekly Advance**: Advance given in the week
   - **Advance Paid Back**: Amount paid back by labour
   - **Notes**: Optional remarks
4. Preview net balance
5. Click **Save Changes**

### Edit Existing Week:
1. Open labour profile (Info icon)
2. Find the week in history table
3. Click **Edit icon** (pencil) in Actions column
4. Modify any values
5. Save changes

### Understanding the Data:

**Net Balance Formula:**
```
Net Balance = Weekly Salary - Weekly Advance + Advance Paid
```

**Example:**
- Weekly Salary: ₹5000
- Weekly Advance: ₹2000
- Advance Paid Back: ₹500
- Net Balance: ₹3500 (green, positive)

**Color Codes:**
- **Green** (positive): Labour has earned more than advanced
- **Red** (negative): Labour still owes advance
- **Blue** icons: Information/contact details
- **Orange**: Advances given
- **Green**: Payments/salary

## Features

### Weekly Tracking:
- Track salary history week by week
- Each week is a separate record
- Cannot create duplicate weeks (prevented by database constraint)
- Edit past weeks anytime

### Smart Date Selection:
- Pick any week start date (Monday)
- Auto-calculates week end (Sunday)
- Quick buttons for current/last week
- Manual date picker for any past week

### Comprehensive View:
- See ALL historical data at once
- Summary statistics at top
- Detailed table with all records
- Sortable by date (newest first)
- Notes visible in table

### Mobile Responsive:
- Large modal adapts to screen size
- Scrollable content on mobile
- Touch-friendly buttons
- Table scrolls horizontally if needed
- Cards stack vertically on small screens

## Database Structure

### labour_salary_history Table:
```sql
- id: UUID (primary key)
- labour_profile_id: UUID (foreign key to labour_profiles)
- week_start_date: DATE (Monday)
- week_end_date: DATE (Sunday)
- weekly_salary: NUMERIC(10,2)
- weekly_advance: NUMERIC(10,2)
- advance_paid: NUMERIC(10,2)
- net_balance: NUMERIC(10,2) (auto-calculated)
- notes: TEXT (optional)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Unique Constraint:
```sql
UNIQUE(labour_profile_id, week_start_date)
```
This prevents duplicate records for the same labour in the same week.

### Auto-Calculated Field:
```sql
net_balance = weekly_salary - weekly_advance + advance_paid
```
The database automatically calculates this on INSERT/UPDATE.

## Benefits

### For Admins:
- Complete salary history at a glance
- Track advances and payments over time
- Identify patterns (who takes more advances)
- Historical records for accounting
- Notes for special situations

### For Labour Management:
- Professional record keeping
- Transparent salary tracking
- Easy to verify past payments
- Quick access to contact info
- Historical data for reference

### For Reporting:
- Sum total salary over time
- Track total advances
- Calculate outstanding balances
- Export-ready table format
- Week-by-week breakdown

## Next Steps

1. ✅ Run BOTH SQL migrations (see above)
2. ✅ Refresh your app at http://localhost:8081/
3. ✅ Test adding a labour profile
4. ✅ Click Info icon to see empty history
5. ✅ Add your first week record
6. ✅ Add more weeks and verify history
7. ✅ Test editing past records
8. ✅ Verify mobile responsiveness
9. ✅ Commit and push to GitHub

## Notes

- All amounts in rupees (₹)
- Decimal precision: 2 places (e.g., 1234.56)
- Dates stored in ISO format (YYYY-MM-DD)
- Net balance auto-calculated by database
- History sorted newest first
- Empty history shows helpful prompt
- Can't create duplicate weeks (database prevents it)
