import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/tracker', label: 'Tracker' },
  { href: '/dashboard/homework', label: 'Homework' },
  { href: '/reports', label: 'Reports' },
  { href: '/students', label: 'Students' },
];

export default function NavBar() {
  return (
    <nav style={{
      backgroundColor: '#1e40af',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      height: '48px',
    }}>
      <span style={{ color: 'white', fontWeight: 700, fontSize: '15px', marginRight: '28px', letterSpacing: '-0.01em' }}>
        StudyCore
      </span>
      {links.map(({ href, label }) => (
        <Link key={href} href={href} style={{
          color: '#bfdbfe',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 500,
          padding: '0 14px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
        }}
          onMouseEnter={undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
