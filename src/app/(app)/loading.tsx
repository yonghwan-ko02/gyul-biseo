export default function AppLoading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      minHeight: '60vh',
      width: '100%'
    }}>
      <div className="spinner" style={{
        width: '50px',
        height: '50px',
        border: '5px solid var(--color-border)',
        borderTop: '5px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{
        marginTop: '16px',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-md)',
        fontWeight: '500'
      }}>
        데이터를 불러오는 중입니다...
      </p>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
