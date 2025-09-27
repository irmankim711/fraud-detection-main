# ai_service.py
import joblib # Use joblib to load models and scalers efficiently
import pandas as pd 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# --- 1. Model Loading (Executed once at startup) ---

# Define the expected path to your saved model and scaler files
MODEL_PATH = "fraud_model.pkl"
SCALER_PATH = "scaler.pkl"

def load_model_artifacts():
    """Loads the pre-trained model and scaler, or returns None if files aren't found."""
    try:
        # Load your trained machine learning model
        model = joblib.load(MODEL_PATH)
        # Load any necessary preprocessing objects (like StandardScaler or MinMaxScaler)
        scaler = joblib.load(SCALER_PATH) 
        print(f"Successfully loaded model from {MODEL_PATH} and scaler.")
        return model, scaler
    except FileNotFoundError:
        print(f"CRITICAL: Model or Scaler file not found. Paths: {MODEL_PATH}, {SCALER_PATH}")
        return None, None
    except Exception as e:
        print(f"An unexpected error occurred during model loading: {e}")
        return None, None

AI_MODEL, SCALER = load_model_artifacts()

# --- 2. Request Schema (Pydantic) ---

# Define the exact data fields matching your BillingTransaction interface
class TransactionData(BaseModel):
    transaction_id: str
    provider_id: str
    amount: float
    transaction_date: str
    patient_id: str = ""
    procedure_code: str = ""
    diagnosis_code: str = ""

# --- 3. FastAPI App Initialization ---

app = FastAPI(
    title="Real-Time Fraud Detection API",
    description="Provides real-time risk scores before payment authorization."
)

# Crucial: Configure CORS for communication with your React frontend
app.add_middleware(
    CORSMiddleware,
    # Replace with your frontend's exact domain/port in production
    allow_origins=["http://localhost:3000"], 
    allow_methods=["POST"],
    allow_headers=["*"],
)

# --- 4. Core Prediction Function ---

def run_model_inference(data: TransactionData, model, scaler) -> float:
    """Processes billing transaction data and returns a fraud risk score."""

    if not model or not scaler:
        raise HTTPException(status_code=500, detail="AI Model service is unavailable.")

    try:
        # Transform billing transaction data to model features
        # This maps billing data to insurance model features (best effort)
        transaction_datetime = pd.to_datetime(data.transaction_date)

        # Create feature mapping - adapting billing data to insurance model format
        features = pd.DataFrame([{
            'TXN_DATE_TIME': transaction_datetime.timestamp(),
            'CUSTOMER_ID': hash(data.patient_id or data.provider_id) % 100000,  # Numeric customer ID
            'PREMIUM_AMOUNT': data.amount * 0.1,  # Simulate premium from billing amount
            'CLAIM_AMOUNT': data.amount,
            'AGE': 45,  # Default age (could be derived from patient_id)
            'TENURE': 5,  # Default tenure
            'INCIDENT_SEVERITY': 'Minor' if data.amount < 1000 else 'Major',
            'AUTHORITIES_CONTACTED': 'None',
            'INCIDENT_STATE': 'OH',  # Default state
            'INCIDENT_CITY': 'Columbus',
            'INCIDENT_LOCATION': 'Other',
            'INCIDENT_TYPE': 'Multi-vehicle Collision',
            'TOTAL_CLAIM_AMOUNT': data.amount,
            'INJURY_CLAIM': data.amount * 0.3 if 'injury' in (data.procedure_code or '').lower() else 0,
            'PROPERTY_CLAIM': data.amount * 0.7,
            'VEHICLE_CLAIM': 0,
            'AUTO_MAKE': 'Saab',
            'AUTO_MODEL': '92x',
            'AUTO_YEAR': 2004,
            'FRAUD': 0,  # Target variable (not used for prediction)

            # Additional features filled with defaults
            'POLICY_NUMBER': hash(data.transaction_id) % 1000000,
            'POLICY_BIND_DATE': (transaction_datetime - pd.Timedelta(days=365)).timestamp(),
            'POLICY_STATE': 'OH',
            'POLICY_CSL': '250/500',
            'POLICY_DEDUCTABLE': 1000,
            'POLICY_ANNUAL_PREMIUM': data.amount * 12,
            'UMBRELLA_LIMIT': 0,
            'INSURED_ZIP': 43215,
            'INSURED_SEX': 'MALE',
            'INSURED_EDUCATION_LEVEL': 'JD',
            'INSURED_OCCUPATION': 'exec-managerial',
            'INSURED_HOBBIES': 'sleeping',
            'INSURED_RELATIONSHIP': 'self',
            'CAPITAL_GAINS': 0,
            'CAPITAL_LOSS': 0,
            'INCIDENT_HOUR_OF_THE_DAY': transaction_datetime.hour,
            'NUMBER_OF_VEHICLES_INVOLVED': 1,
            'BODILY_INJURIES': 1 if 'injury' in (data.procedure_code or '').lower() else 0,
            'WITNESSES': 2,
            'POLICE_REPORT_AVAILABLE': 'YES'
        }])

        # Apply the same preprocessing as training
        features_scaled = scaler.transform(features)

        # Get fraud probability
        risk_score = model.predict_proba(features_scaled)[:, 1][0]

        return float(risk_score)

    except Exception as e:
        print(f"Error in feature transformation: {e}")
        # Return moderate risk score if feature engineering fails
        return 0.5


# --- 5. API Endpoint ---

@app.post("/api/fraud-check", tags=["Predictions"])
async def fraud_check(transaction: TransactionData):
    """Accepts transaction data and returns a fraud risk score and action."""
    
    try:
        # 5a. Get the risk score from the AI model
        risk_score = run_model_inference(transaction, AI_MODEL, SCALER)
        
        # 5b. Apply Risk Thresholds for Actionable Decision
        # These thresholds should be tuned based on business risk tolerance (False Positive vs. False Negative rates)
        AUTO_BLOCK_THRESHOLD = 0.7 
        MANUAL_REVIEW_THRESHOLD = 0.3

        if risk_score >= AUTO_BLOCK_THRESHOLD:
            action = "BLOCK"
            message = "High risk of fraud. Transaction blocked."
        elif risk_score >= MANUAL_REVIEW_THRESHOLD:
            action = "REVIEW"
            message = "Medium risk. Require step-up authentication (e.g., 3D Secure/OTP)."
        else:
            action = "APPROVE"
            message = "Low risk. Proceed to payment gateway."
            
        # 5c. Return the decision to the frontend
        return {
            "risk_score": round(risk_score, 4),
            "suggested_action": action,
            "message": message
        }

    except HTTPException as e:
        # Re-raise explicit HTTP exceptions (e.g., model not loaded)
        raise e
    except Exception as e:
        # Catch any unexpected errors and return a clean 500 error
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during AI prediction.")