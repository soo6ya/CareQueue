function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        🏥 <span>CareQueue</span>
      </div>

      <div className="nav-links">
        <a href="/">Home</a>
        <a href="#about">About</a>
        <a href="#features">Features</a>
        <button className="nav-login">Patient Login</button>
        <button className="nav-admin">Admin Login</button>
      </div>
    </nav>
  );
}

export default Navbar;