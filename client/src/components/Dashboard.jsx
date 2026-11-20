import { useState } from 'react';
import SummaryCards from './SummaryCards.jsx';
import StatsBar from './StatsBar.jsx';
import InsightsPanel from './InsightsPanel.jsx';
import ReviewsTable from './ReviewsTable.jsx';
import ProductView from './ProductView.jsx';

function Dashboard({ data }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { dashboard, reviews, products, stats } = data;

  return (
    <div className="dashboard">
      <SummaryCards dashboard={dashboard} />

      {stats && <StatsBar stats={stats} />}

      <nav className="tab-nav">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview
        </button>
        <button
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          📦 Products
        </button>
      </nav>

      {activeTab === 'overview' && (
        <>
          <InsightsPanel
            complaints={dashboard.complaints}
            praises={dashboard.praises}
          />
          <ReviewsTable reviews={reviews} products={products} />
        </>
      )}

      {activeTab === 'products' && (
        <ProductView products={products} />
      )}
    </div>
  );
}

export default Dashboard;
