function DatasetPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dataset Overview</h1>
          <p>
            Summary of the cleaned and feature-engineered shipment dataset used
            for import risk analysis.
          </p>
        </div>

        <div className="status-pill">Validated Dataset</div>
      </header>

      <section className="cards">
        <div className="card">
          <span>Total Records</span>
          <strong>263,821</strong>
          <p>Final cleaned dataset</p>
        </div>

        <div className="card">
          <span>Dataset Columns</span>
          <strong>17</strong>
          <p>After feature engineering</p>
        </div>

        <div className="card">
          <span>Missing Values</span>
          <strong>0</strong>
          <p>Validated final dataset</p>
        </div>

        <div className="card">
          <span>Duplicate Rows</span>
          <strong>0</strong>
          <p>No duplicate rows found</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Dataset Preparation Status</h3>
            <p>
              The dataset has been cleaned, validated and prepared for model
              evaluation. This page separates dataset information from the main
              dashboard so the interface remains scalable.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default DatasetPage;