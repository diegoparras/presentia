TRAIN_CLS = {
    "columns": ["age", "job", "churn"],
    "rows": [
        {"age": 25, "job": "eng", "churn": "stay"},
        {"age": 45, "job": "mgr", "churn": "churn"},
        {"age": 35, "job": "eng", "churn": "stay"},
        {"age": 52, "job": "mgr", "churn": "churn"},
        {"age": 29, "job": "eng", "churn": "stay"},
    ],
}
PREDICT_CLS = {"rows": [{"age": 30, "job": "eng"}, {"age": 48, "job": "mgr"}]}


def test_health(client):
    r = client.get("/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["engine"] == "fake"


def test_predict_classification(client):
    r = client.post(
        "/v1/predict",
        json={"task": "auto", "target": "churn", "train": TRAIN_CLS, "predict": PREDICT_CLS},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["task"] == "classification"
    assert len(body["predictions"]) == 2
    assert body["probabilities"] is not None
    assert abs(sum(body["probabilities"][0].values()) - 1.0) < 1e-6
    assert body["engine"] == "fake"


def test_predict_regression(client):
    train = {
        "columns": ["sqft", "price"],
        "rows": [
            {"sqft": 1200, "price": 250000.0},
            {"sqft": 2500, "price": 550000.0},
            {"sqft": 1500, "price": 310000.0},
            {"sqft": 3000, "price": 620000.7},
        ],
    }
    r = client.post(
        "/v1/predict",
        json={"target": "price", "train": train, "predict": {"rows": [{"sqft": 1800}]}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["task"] == "regression"
    assert isinstance(body["predictions"][0], float)


def test_predict_missing_target_is_422(client):
    r = client.post(
        "/v1/predict",
        json={"target": "nope", "train": TRAIN_CLS, "predict": PREDICT_CLS},
    )
    assert r.status_code == 422


def test_importance(client):
    r = client.post(
        "/v1/importance", json={"target": "churn", "dataset": TRAIN_CLS}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    features = {i["feature"] for i in body["importance"]}
    assert features == {"age", "job"}


def test_validate(client):
    r = client.post("/v1/validate", json={"target": "churn", "dataset": TRAIN_CLS})
    assert r.status_code == 200, r.text
    assert r.json()["metric"] == "accuracy"


def test_anomalies(client):
    rows = [{"x": v} for v in range(30)] + [{"x": 9999}]
    r = client.post("/v1/anomalies", json={"dataset": {"rows": rows}, "options": {"top_k": 2}})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["method"] == "isolation_forest"
    assert 30 in [a["row_index"] for a in body["anomalies"]]
