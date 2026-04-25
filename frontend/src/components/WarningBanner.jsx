import React from "react";

const WarningBanner = ({ warning }) => {
  if (!warning) return null;

  return (
    <div className="warning-banner">
      ⚠️ {warning}
    </div>
  );
};

export default WarningBanner;