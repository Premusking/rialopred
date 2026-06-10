// Toast component
interface ToastProps { message: string; }
export function Toast({ message }: ToastProps) {
  return (
    <div style={{
      position: "fixed", bottom: 72, right: 16, zIndex: 300,
      background: "var(--s2)", border: "1px solid var(--ac)",
      borderRadius: 9, padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 12, fontFamily: "var(--ff)",
      boxShadow: "0 4px 24px rgba(0,229,160,.15)",
      animation: "slideUp .25s ease",
      maxWidth: 280,
    }}>
      <span style={{ color: "var(--ac)", fontSize: 14 }}>✓</span>
      {message}
    </div>
  );
}
