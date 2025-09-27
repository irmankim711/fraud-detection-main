# ai_service.py
import joblib # Use joblib to load models and scalers efficiently
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import time
from functools import lru_cache
from datetime import datetime

# --- 1. Model Loading (Executed once at startup) ---

# Define the expected path to your saved model and scaler files
MODEL_PATH = "fraud_model.pkl"
SCALER_PATH = "scaler.pkl"

def load_model_artifacts():
    """Loads the pre-trained model and scaler with proper error handling."""
    try:
        # Suppress sklearn version warnings for model compatibility
        import warnings
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning)
            warnings.filterwarnings("ignore", message=".*version.*")

            # Load model and scaler
            model = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)

        print(f"✅ Successfully loaded model and scaler (version warnings suppressed)")

        # Validate model has required methods
        if not hasattr(model, 'predict_proba'):
            print("⚠️  Model doesn't support probability prediction, using predict() instead")

        return model, scaler

    except FileNotFoundError as e:
        print(f"❌ Model files not found: {e}")
        print(f"Expected paths: {MODEL_PATH}, {SCALER_PATH}")
        return None, None

    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        print("Will use rule-based fraud detection as fallback")
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

# Performance optimization: Cache feature transformation results
@lru_cache(maxsize=1000)
def get_cached_features(transaction_id: str, provider_id: str, amount: float,
                       transaction_date: str, patient_id: str, procedure_code: str) -> tuple:
    """Cache expensive feature engineering computations."""
    transaction_datetime = pd.to_datetime(transaction_date)
    hour_of_day = transaction_datetime.hour
    day_of_week = transaction_datetime.weekday()

    is_high_amount = 1 if amount > 5000 else 0
    is_weekend = 1 if day_of_week >= 5 else 0
    is_after_hours = 1 if hour_of_day < 7 or hour_of_day > 19 else 0

    return (hour_of_day, day_of_week, is_high_amount, is_weekend, is_after_hours,
            transaction_datetime.timestamp())

def run_model_inference(data: TransactionData, model, scaler) -> float:
    """Processes billing transaction data and returns a fraud risk score using healthcare-specific rules."""

    if not model or not scaler:
        # If model unavailable, use rule-based fraud detection
        return calculate_rule_based_fraud_score(data)

    try:
        # Use cached feature engineering for performance
        start_time = time.time()

        (hour_of_day, day_of_week, is_high_amount, is_weekend, is_after_hours,
         timestamp) = get_cached_features(
            data.transaction_id, data.provider_id, data.amount,
            data.transaction_date, data.patient_id or "", data.procedure_code or ""
        )

        # Create simplified feature set that works with existing model
        # Map healthcare data to available model features efficiently
        features = pd.DataFrame([{
            'TXN_DATE_TIME': timestamp,
            'CUSTOMER_ID': hash(data.patient_id or data.provider_id) % 100000,
            'PREMIUM_AMOUNT': data.amount * 0.1,  # Equivalent premium estimate
            'CLAIM_AMOUNT': data.amount,
            'AGE': 45,  # Default - could be enhanced with patient data
            'TENURE': 5,  # Default tenure
            'INCIDENT_SEVERITY': 'Major' if is_high_amount else 'Minor',
            'AUTHORITIES_CONTACTED': 'None',
            'INCIDENT_STATE': 'OH',
            'INCIDENT_CITY': 'Columbus',
            'INCIDENT_LOCATION': 'Other',
            'INCIDENT_TYPE': 'Multi-vehicle Collision',
            'TOTAL_CLAIM_AMOUNT': amount,
            'INJURY_CLAIM': amount * 0.3 if 'injury' in (data.procedure_code or '').lower() else 0,
            'PROPERTY_CLAIM': amount * 0.7,
            'VEHICLE_CLAIM': 0,
            'AUTO_MAKE': 'Saab',
            'AUTO_MODEL': '92x',
            'AUTO_YEAR': 2004,
            'FRAUD': 0,
            'POLICY_NUMBER': hash(data.transaction_id) % 1000000,
            'POLICY_BIND_DATE': (transaction_datetime - pd.Timedelta(days=365)).timestamp(),
            'POLICY_STATE': 'OH',
            'POLICY_CSL': '250/500',
            'POLICY_DEDUCTABLE': 1000,
            'POLICY_ANNUAL_PREMIUM': amount * 12,
            'UMBRELLA_LIMIT': 0,
            'INSURED_ZIP': 43215,
            'INSURED_SEX': 'MALE',
            'INSURED_EDUCATION_LEVEL': 'JD',
            'INSURED_OCCUPATION': 'exec-managerial',
            'INSURED_HOBBIES': 'sleeping',
            'INSURED_RELATIONSHIP': 'self',
            'CAPITAL_GAINS': 0,
            'CAPITAL_LOSS': 0,
            'INCIDENT_HOUR_OF_THE_DAY': hour_of_day,
            'NUMBER_OF_VEHICLES_INVOLVED': 1,
            'BODILY_INJURIES': 1 if 'injury' in (data.procedure_code or '').lower() else 0,
            'WITNESSES': 2,
            'POLICE_REPORT_AVAILABLE': 'YES'
        }])

        # Apply preprocessing
        features_scaled = scaler.transform(features)

        # Get model prediction with fallback handling
        if hasattr(model, 'predict_proba'):
            # Get fraud probability (assuming binary classification)
            probabilities = model.predict_proba(features_scaled)
            if probabilities.shape[1] > 1:
                risk_score = probabilities[:, 1][0]  # Fraud class probability
            else:
                risk_score = probabilities[0][0]
        else:
            # Fallback to predict() method
            prediction = model.predict(features_scaled)[0]
            risk_score = float(prediction) if prediction <= 1.0 else float(prediction) / 100.0

        # Adjust score based on healthcare-specific rules
        adjusted_score = adjust_healthcare_fraud_score(risk_score, data)

        # Performance monitoring
        processing_time = time.time() - start_time
        if processing_time > 0.1:  # Log slow predictions
            print(f"⚠️  Slow prediction: {processing_time:.3f}s for transaction {data.transaction_id}")

        return float(adjusted_score)

    except Exception as e:
        print(f"Error in model inference: {e}")
        # Fallback to rule-based scoring
        return calculate_rule_based_fraud_score(data)


def calculate_rule_based_fraud_score(data: TransactionData) -> float:
    """Rule-based fraud detection for healthcare transactions when ML model fails."""
    base_score = 0.1

    # High amount transactions are riskier
    if data.amount > 10000:
        base_score += 0.4
    elif data.amount > 5000:
        base_score += 0.2
    elif data.amount > 1000:
        base_score += 0.1

    # Weekend/after-hours transactions are riskier
    transaction_datetime = pd.to_datetime(data.transaction_date)
    if transaction_datetime.weekday() >= 5:  # Weekend
        base_score += 0.1
    if transaction_datetime.hour < 7 or transaction_datetime.hour > 19:  # After hours
        base_score += 0.1

    # Suspicious procedure codes
    if data.procedure_code and any(code in data.procedure_code.upper() for code in ['99999', '00000']):
        base_score += 0.3

    # Missing critical information
    if not data.patient_id or not data.procedure_code:
        base_score += 0.2

    return min(base_score, 0.95)  # Cap at 95%


def adjust_healthcare_fraud_score(model_score: float, data: TransactionData) -> float:
    """Adjust ML model score with healthcare-specific business rules."""
    adjusted_score = model_score

    # Healthcare-specific adjustments
    if data.amount > 15000:  # Very high amount
        adjusted_score = min(adjusted_score + 0.2, 0.95)

    # Emergency procedures during unusual hours might be legitimate
    if 'emergency' in (data.procedure_code or '').lower():
        adjusted_score = max(adjusted_score - 0.1, 0.05)

    return adjusted_score


# --- 5. API Endpoint ---

@app.post("/api/fraud-check", tags=["Predictions"])
async def fraud_check(transaction: TransactionData):
    """Accepts transaction data and returns comprehensive fraud risk analysis."""

    try:
        # Get the risk score from the AI model
        risk_score = run_model_inference(transaction, AI_MODEL, SCALER)

        # Healthcare-specific risk thresholds
        AUTO_BLOCK_THRESHOLD = 0.8  # Higher threshold for healthcare
        MANUAL_REVIEW_THRESHOLD = 0.4  # More conservative for healthcare fraud

        # Determine action and risk level
        if risk_score >= AUTO_BLOCK_THRESHOLD:
            action = "BLOCK"
            risk_level = "HIGH"
            message = "High fraud risk detected. Transaction requires immediate review."
            confidence = "High"
        elif risk_score >= MANUAL_REVIEW_THRESHOLD:
            action = "REVIEW"
            risk_level = "MEDIUM"
            message = "Medium fraud risk. Manual review recommended before processing."
            confidence = "Medium"
        else:
            action = "APPROVE"
            risk_level = "LOW"
            message = "Low fraud risk. Safe to process."
            confidence = "High"

        # Generate fraud indicators for transparency
        fraud_indicators = []
        if transaction.amount > 10000:
            fraud_indicators.append("High transaction amount")

        from datetime import datetime
        transaction_time = datetime.fromisoformat(transaction.transaction_date.replace('Z', '+00:00'))
        if transaction_time.weekday() >= 5:
            fraud_indicators.append("Weekend transaction")
        if transaction_time.hour < 7 or transaction_time.hour > 19:
            fraud_indicators.append("After-hours transaction")

        if not transaction.patient_id:
            fraud_indicators.append("Missing patient information")
        if not transaction.procedure_code:
            fraud_indicators.append("Missing procedure code")

        # Model status for debugging
        model_status = "ML_MODEL" if AI_MODEL else "RULE_BASED"

        # Comprehensive response
        return {
            "transaction_id": transaction.transaction_id,
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "suggested_action": action,
            "confidence": confidence,
            "message": message,
            "fraud_indicators": fraud_indicators,
            "model_used": model_status,
            "processing_timestamp": datetime.now().isoformat(),
            "thresholds": {
                "block_threshold": AUTO_BLOCK_THRESHOLD,
                "review_threshold": MANUAL_REVIEW_THRESHOLD
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Fraud check error: {e}")
        # Return safe fallback response
        return {
            "transaction_id": transaction.transaction_id,
            "risk_score": 0.5,
            "risk_level": "MEDIUM",
            "suggested_action": "REVIEW",
            "confidence": "Low",
            "message": "Unable to process fraud check. Manual review required.",
            "fraud_indicators": ["System error occurred"],
            "model_used": "FALLBACK",
            "processing_timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """System health and model status check."""
    model_status = "operational" if AI_MODEL and SCALER else "degraded"

    return {
        "status": "healthy",
        "model_status": model_status,
        "model_loaded": AI_MODEL is not None,
        "scaler_loaded": SCALER is not None,
        "cache_info": get_cached_features.cache_info()._asdict(),
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


# Performance metrics endpoint
@app.get("/metrics", tags=["System"])
async def get_metrics():
    """Get performance metrics and system statistics."""
    cache_stats = get_cached_features.cache_info()

    return {
        "cache_hits": cache_stats.hits,
        "cache_misses": cache_stats.misses,
        "cache_size": cache_stats.currsize,
        "cache_hit_rate": cache_stats.hits / max(cache_stats.hits + cache_stats.misses, 1),
        "model_type": type(AI_MODEL).__name__ if AI_MODEL else "None",
        "features_cached": cache_stats.currsize,
        "timestamp": datetime.now().isoformat()
    }