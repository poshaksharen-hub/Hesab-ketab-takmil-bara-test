
{
  "description": "Comprehensive and finalized technical specification for the Khanevadati app backend, designed for migration to Supabase/PostgreSQL. This is the single source of truth for the data model, merging the original design with insights from the existing codebase.",
  "entities": {
    "users": {
      "description": "User profiles, linked one-to-one with Supabase's 'auth.users' table. Stores additional app-specific user data.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key, mirrors 'auth.users.id'." },
        "email": { "type": "string", "description": "User's email." },
        "first_name": { "type": "string", "description": "User's first name." },
        "last_name": { "type": "string", "description": "User's last name." },
        "signature_image_path": { "type": "string", "optional": true, "description": "Path to the user's signature image in Supabase Storage." },
        "created_at": { "type": "timestamp", "description": "Timestamp of creation." },
        "updated_at": { "type": "timestamp", "description": "Timestamp of last update." }
      }
    },
    "bank_accounts": {
      "description": "Bank accounts, both personal and shared.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "owner_id": { "type": "string", "enum": ["ali", "fatemeh", "shared_account"], "description": "Indicates account ownership." },
        "bank_name": { "type": "string", "description": "The name of the bank." },
        "account_number": { "type": "string", "optional": true, "description": "Bank account number." },
        "card_number": { "type": "string", "optional": true, "description": "Associated debit/credit card number." },
        "expiry_date": { "type": "string", "optional": true, "description": "Card expiry date (MM/YY)." },
        "cvv2": { "type": "string", "optional": true, "description": "Card CVV2." },
        "account_type": { "type": "string", "enum": ["checking", "savings"], "optional": true },
        "balance": { "type": "number", "description": "Current total balance." },
        "initial_balance": { "type": "number", "default": 0, "description": "Balance at the time of creation." },
        "blocked_balance": { "type": "number", "default": 0, "description": "Amount reserved for pending outgoing cheques." },
        "theme": { "type": "string", "optional": true, "description": "UI color theme for the card." },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" },
        "is_deleted": { "type": "boolean", "default": false },
        "deleted_at": { "type": "timestamp", "optional": true }
      }
    },
    "categories": {
      "description": "Expense and income categories.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "name": { "type": "string", "description": "Category name." },
        "description": { "type": "string", "optional": true, "description": "Optional category description." },
        "is_archived": { "type": "boolean", "default": false, "description": "To archive instead of delete." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" }
      }
    },
    "payees": {
      "description": "Payees, such as persons, stores, or organizations.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "name": { "type": "string", "description": "Name of the payee." },
        "phone_number": { "type": "string", "optional": true, "description": "Contact phone number." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" }
      }
    },
    "expenses": {
      "description": "Expense transactions.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "bank_account_id": { "type": "uuid", "description": "FK to bank_accounts.id." },
        "category_id": { "type": "uuid", "description": "FK to categories.id." },
        "payee_id": { "type": "uuid", "optional": true, "description": "FK to payees.id." },
        "amount": { "type": "number", "description": "Expense amount." },
        "date": { "type": "timestamp", "description": "Date of the expense." },
        "description": { "type": "text", "optional": true },
        "expense_for": { "type": "string", "enum": ["ali", "fatemeh", "shared"], "description": "Beneficiary of the expense." },
        "sub_type": { "type": "string", "enum": ["goal_contribution", "loan_payment", "debt_payment"], "optional": true, "description": "Differentiates special expenses linked to other entities." },
        "related_goal_id": { "type": "uuid", "optional": true, "description": "Link to financial_goals if it's a goal contribution." },
        "related_loan_payment_id": { "type": "uuid", "optional": true, "description": "Link to loan_payments." },
        "related_debt_payment_id": { "type": "uuid", "optional": true, "description": "Link to debt_payments." },
        "related_check_id": { "type": "uuid", "optional": true, "description": "Link to cheques if cleared." },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" }
      }
    },
    "incomes": {
      "description": "Income transactions.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "bank_account_id": { "type": "uuid", "description": "FK to bank_accounts.id." },
        "source_text": { "type": "string", "description": "The original source of income as text." },
        "owner_id": { "type": "string", "enum": ["ali", "fatemeh", "daramad_moshtarak"], "description": "Who earned the income." },
        "category": { "type": "string", "description": "Always 'درآمد'." },
        "amount": { "type": "number", "description": "Income amount." },
        "date": { "type": "timestamp", "description": "Date of income." },
        "description": { "type": "text", "optional": true },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" }
      }
    },
    "transfers": {
      "description": "Internal account-to-account transfers.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "from_bank_account_id": { "type": "uuid", "description": "FK to bank_accounts.id (source)." },
        "to_bank_account_id": { "type": "uuid", "description": "FK to bank_accounts.id (destination)." },
        "amount": { "type": "number", "description": "Amount transferred." },
        "transfer_date": { "type": "timestamp", "description": "Date of transfer." },
        "description": { "type": "text", "optional": true },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" }
      }
    },
    "cheques": {
      "description": "Manages outgoing cheques as future liabilities.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "sayad_id": { "type": "string", "description": "Sayad ID of the cheque." },
        "serial_number": { "type": "string", "description": "Physical serial number on the cheque." },
        "amount": { "type": "number", "description": "Amount of the cheque." },
        "issue_date": { "type": "timestamp", "description": "Date the cheque was issued." },
        "due_date": { "type": "timestamp", "description": "Date the cheque is due." },
        "status": { "type": "string", "enum": ["pending", "cleared", "bounced", "cancelled"], "default": "pending" },
        "bank_account_id": { "type": "uuid", "description": "FK to the bank account." },
        "payee_id": { "type": "uuid", "description": "FK to the payee." },
        "category_id": { "type": "uuid", "description": "FK to categories.id." },
        "description": { "type": "text", "optional": true, "description": "Notes about the cheque." },
        "expense_for": { "type": "string", "enum": ["ali", "fatemeh", "shared"], "description": "Beneficiary of the check." },
        "cleared_date": { "type": "timestamp", "optional": true },
        "signature_data_url": { "type": "text", "optional": true, "description": "Base64 encoded signature image." },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" }
      }
    },
    "financial_goals": {
        "description": "Financial goals for users.",
        "fields": {
            "id": { "type": "uuid", "description": "Primary Key." },
            "name": { "type": "string" },
            "target_amount": { "type": "number" },
            "current_amount": { "type": "number", "default": 0 },
            "target_date": { "type": "timestamp" },
            "priority": { "type": "string", "enum": ["low", "medium", "high"] },
            "is_achieved": { "type": "boolean", "default": false },
            "actual_cost": { "type": "number", "optional": true },
            "owner_id": { "type": "string", "enum": ["ali", "fatemeh", "shared"] },
            "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
            "created_at": { "type": "timestamp" },
            "updated_at": { "type": "timestamp" }
        }
    },
    "goal_contributions": {
        "description": "Records contributions towards a financial goal. Each contribution is also an expense.",
        "fields": {
            "id": { "type": "uuid", "description": "Primary Key, should be the same as the corresponding expense.id." },
            "goal_id": { "type": "uuid", "description": "FK to financial_goals.id." },
            "expense_id": { "type": "uuid", "description": "FK to expenses.id." },
            "amount": { "type": "number" },
            "date": { "type": "timestamp" },
            "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
            "created_at": { "type": "timestamp" }
        }
    },
    "loans": {
      "description": "Loans taken (money borrowed), typically structured with installments.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key." },
        "title": { "type": "string", "description": "Loan title or description." },
        "amount": { "type": "number", "description": "Total loan amount." },
        "remaining_amount": { "type": "number", "description": "Amount yet to be paid." },
        "installment_amount": { "type": "number" },
        "number_of_installments": { "type": "integer" },
        "paid_installments": { "type": "integer", "default": 0 },
        "start_date": { "type": "timestamp" },
        "first_installment_date": { "type": "timestamp" },
        "payment_day": { "type": "integer", "optional": true, "description": "Day of the month for installment payments." },
        "payee_id": { "type": "uuid", "optional": true, "description": "FK to payees.id (the lender)." },
        "deposit_on_create": { "type": "boolean", "default": false },
        "deposit_to_account_id": { "type": "uuid", "optional": true, "description": "FK to bank_accounts.id if deposited." },
        "owner_id": { "type": "string", "enum": ["ali", "fatemeh", "shared"], "description": "Who is responsible for this loan." },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" },
        "updated_at": { "type": "timestamp" }
      }
    },
    "loan_payments": {
      "description": "Records of loan installment payments. Each payment is also an expense.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key, same as corresponding expense.id." },
        "loan_id": { "type": "uuid", "description": "FK to loans.id." },
        "expense_id": { "type": "uuid", "description": "FK to expenses.id." },
        "amount": { "type": "number" },
        "payment_date": { "type": "timestamp" },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" }
      }
    },
    "debts": {
        "description": "Debts owed to others, can be single payment or informal installments.",
        "fields": {
            "id": { "type": "uuid", "description": "Primary Key." },
            "description": { "type": "string" },
            "amount": { "type": "number" },
            "remaining_amount": { "type": "number" },
            "payee_id": { "type": "uuid", "description": "FK to payees.id (the person/entity owed)." },
            "is_installment": { "type": "boolean", "default": false },
            "due_date": { "type": "timestamp", "optional": true },
            "installment_amount": { "type": "number", "optional": true },
            "owner_id": { "type": "string", "enum": ["ali", "fatemeh", "shared"], "description": "Who is responsible for this debt." },
            "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
            "created_at": { "type": "timestamp" },
            "updated_at": { "type": "timestamp" }
        }
    },
    "debt_payments": {
      "description": "Records payments made towards a debt. Each payment is also an expense.",
      "fields": {
        "id": { "type": "uuid", "description": "Primary Key, same as corresponding expense.id." },
        "debt_id": { "type": "uuid", "description": "FK to debts.id." },
        "expense_id": { "type": "uuid", "description": "FK to expenses.id." },
        "amount": { "type": "number" },
        "payment_date": { "type": "timestamp" },
        "registered_by_user_id": { "type": "uuid", "description": "FK to users.id." },
        "created_at": { "type": "timestamp" }
      }
    },
    "chat_messages": {
        "description": "Messages in the in-app chat.",
        "fields": {
            "id": { "type": "uuid", "description": "Primary Key." },
            "sender_id": { "type": "string", "description": "Can be user UUID or 'system'." },
            "sender_name": { "type": "string" },
            "text": { "type": "text" },
            "read_by": { "type": "uuid[]", "description": "Array of user IDs who have read the message." },
            "type": { "type": "string", "enum": ["user", "system"] },
            "transaction_details": { "type": "jsonb", "optional": true, "description": "If the message is about a transaction, its details are stored here." },
            "reply_to_message_id": { "type": "uuid", "optional": true, "description": "Self-referencing FK for replies." },
            "timestamp": { "type": "timestamp" }
        }
    }
  },
  "businessLogic": {
    "chequeManagement": {
      "issuance": "When a cheque with 'pending' status is created, its amount is added to 'bank_accounts.blocked_balance'. The main 'balance' is not affected.",
      "clearing": "When a cheque status changes to 'cleared', a corresponding record is created in the 'expenses' table. The amount is subtracted from both 'balance' and 'blocked_balance' of the linked bank account. This must happen in a single database transaction.",
      "bouncing_cancellation": "When a cheque is 'bounced' or 'cancelled', the amount is subtracted from 'blocked_balance', making it available again."
    },
    "transactionAtomicity": "Operations like transfers, loan/debt payments, and goal contributions must be atomic. For example, a loan payment must create an 'expenses' record and a 'loan_payments' record, and update the 'loans.remaining_amount' in a single transaction."
  },
  "migrationGuide": {
    "notes": "All camelCase field names from the old Firestore structure must be mapped to snake_case in the new PostgreSQL database.",
    "foreignKeys": [
      { "from": "expenses.bank_account_id", "to": "bank_accounts.id" },
      { "from": "expenses.category_id", "to": "categories.id" },
      { "from": "incomes.bank_account_id", "to": "bank_accounts.id" },
      { "from": "transfers.from_bank_account_id", "to": "bank_accounts.id" },
      { "from": "transfers.to_bank_account_id", "to": "bank_accounts.id" },
      { "from": "cheques.bank_account_id", "to": "bank_accounts.id" },
      { "from": "cheques.payee_id", "to": "payees.id" },
      { "from": "goal_contributions.goal_id", "to": "financial_goals.id" },
      { "from": "goal_contributions.expense_id", "to": "expenses.id" },
      { "from": "loan_payments.loan_id", "to": "loans.id" },
      { "from": "loan_payments.expense_id", "to": "expenses.id" },
      { "from": "debt_payments.debt_id", "to": "debts.id" },
      { "from": "debt_payments.expense_id", "to": "expenses.id" },
      { "from": "chat_messages.reply_to_message_id", "to": "chat_messages.id" }
    ],
    "indexes": [
      "date", "due_date", "payment_date", "transfer_date", "timestamp",
      "status", "type", "expense_for", "owner_id",
      "bank_account_id", "category_id", "payee_id", "loan_id", "debt_id", "goal_id", "user_id",
      "is_deleted", "is_achieved", "sender_id"
    ]
  }
}
