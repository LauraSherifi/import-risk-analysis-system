# Import Risk Analysis System

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

## Neural Network Training (nora)

Week 2 neural network work is in:

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
