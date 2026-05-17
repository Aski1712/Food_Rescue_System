const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] md:min-h-[600px] py-12 px-4">
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="relative w-16 h-16 md:w-20 md:h-20">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 border-r-primary-500 animate-spin"></div>
        </div>
      </div>
      <p className="text-sm md:text-base font-medium text-slate-600 animate-pulse">Loading...</p>
    </div>
  </div>
);

export default LoadingSpinner;
