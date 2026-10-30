const GlassCard = ({ children, className = '', onClick, ...props }) => {
  return (
    <div
      className={`glass-card p-5 transition-all duration-300 hover:bg-white/[0.07] ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
