import { useState } from 'react';
import SummaryCards from './SummaryCards.jsx';
import StatsBar from './StatsBar.jsx';
import InsightsPanel from './InsightsPanel.jsx';
import ReviewsTable from './ReviewsTable.jsx';
import ProductView from './ProductView.jsx';

function Dashboard({ data }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { dashboard, reviews = [], products = {}, stats } = data;
  const productCount = Object.keys(products).length;

  return (
    <div className="dashboard-root">
      <SummaryCards dashboard={dashboard} />

      {stats && <StatsBar stats={stats} />}

      <div className="tab-navigation-bar">
        <nav className="modern-tab-nav">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-icon">📋</span>
            <span>Insights & Reviews</span>
            <span className="tab-count-badge">{reviews.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <span className="tab-icon">📦</span>
            <span>Product Breakdown</span>
            {productCount > 0 && <span className="tab-count-badge">{productCount}</span>}
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="tab-pane-content">
          <InsightsPanel
            complaints={dashboard.complaints}
            praises={dashboard.praises}
          />
          <ReviewsTable reviews={reviews} products={products} />
        </div>
      )}

      {activeTab === 'products' && (
        <div className="tab-pane-content">
          <ProductView products={products} />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
