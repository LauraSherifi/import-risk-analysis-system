# Import Risk Analysis System

## Project Overview

This project contains a React frontend, an Express backend, and a Flask ML API
for import shipment risk prediction. The ML pipeline cleans shipment data,
creates engineered features, trains classification models, and serves HIGH RISK
or LOW RISK predictions.

## Setup

1. Clone repo:
git clone https://github.com/LauraSherifi/import-risk-analysis-system.git

2. Go into project:
cd import-risk-analysis-system

3. Switch to dev:
git checkout dev

4. Create your branch:
git checkout -b feature/your-task

## Rules
- Do NOT work on main
- Always pull before starting:
  git pull
- Commit and push regularly

## Run the Project

Start the three services in separate terminals.

### ML API

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ml
python app.py
```

The ML API runs on `http://localhost:8001`.

### Backend

```powershell
cd backend
npm install
npm start
```

The backend runs on `http://localhost:8000`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:8002`.

## Neural Network Training

Leonora's Week 2 neural network work is in:

```text
ml/src/neural_network_model.py
```

Run it after installing `requirements.txt`:

```powershell
cd ml
python src/neural_network_model.py
```

The script tests two neural network architectures, saves tuning results, and
exports the best model as:

```text
ml/models/import_risk_neural_network.h5
```
