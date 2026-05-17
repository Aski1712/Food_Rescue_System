const RealtimeToast = ({ event, onClose }) => {
  if (!event) return null;

  const titleMap = {
    newDonation: 'New Donation Available',
    deliveryUpdate: 'Delivery Update',
    donationStatus: 'Donation Status',
    volunteerUpdate: 'Volunteer Location',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-900">{titleMap[event.type] || 'Update'}</h4>
          <p className="mt-2 text-sm text-slate-600">
            {event.message || (
              <>
                {event.type === 'newDonation' && `New donation: ${event.payload.title}`}
                {event.type === 'deliveryUpdate' && `Delivery status updated to ${event.payload.status}`}
                {event.type === 'donationStatus' && `Donation ${event.payload.donationId} is now ${event.payload.status}`}
                {event.type === 'volunteerUpdate' && `Volunteer moved to [${event.payload.location.coordinates[1].toFixed(3)}, ${event.payload.location.coordinates[0].toFixed(3)}]`}
              </>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default RealtimeToast;
