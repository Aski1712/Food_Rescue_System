const DonationCard = ({ donation, onAccept, onReject, showLocation = false }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Accepted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed':
        return 'bg-[var(--surface-muted)] text-slate-700 border-slate-200';
      default:
        return 'bg-[var(--surface-muted)] text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="group surface-card rounded-2xl p-5 md:p-6 shadow-soft border border-slate-200 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 truncate">{donation.title}</h3>
            <p className="text-sm md:text-base text-slate-600 mt-1 line-clamp-2">{donation.description}</p>
          </div>
          <div className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs md:text-sm font-semibold whitespace-nowrap ${getStatusColor(donation.status)}`}>
            {donation.status}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-[var(--surface-muted)] rounded-xl p-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Quantity</p>
            <p className="text-lg md:text-xl font-semibold text-slate-900 mt-1">{donation.quantity}</p>
          </div>
          <div className="bg-[var(--surface-muted)] rounded-xl p-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Donor</p>
            <p className="text-sm md:text-base font-medium text-slate-900 mt-1 truncate">{donation.donor?.name || 'Unknown'}</p>
            {donation.donor?.phone && (
              <a
                href={`tel:${donation.donor.phone.replace(/[^+\d]/g, '')}`}
                className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-800"
              >
                Call donor
              </a>
            )}
          </div>
          {showLocation && donation.location?.address && (
            <div className="bg-[var(--surface-muted)] rounded-xl p-3 col-span-2 md:col-span-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Location</p>
              <p className="text-sm md:text-base font-medium text-slate-900 mt-1 truncate">{donation.location.address}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {(onAccept || onReject) && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
            {onAccept && (
              <button 
                onClick={onAccept} 
                className="flex-1 px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-emerald-600 text-white font-semibold text-sm md:text-base hover:bg-emerald-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                ✓ Accept
              </button>
            )}
            {onReject && (
              <button 
                onClick={onReject} 
                className="flex-1 px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-red-600 text-white font-semibold text-sm md:text-base hover:bg-red-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                ✕ Reject
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationCard;
