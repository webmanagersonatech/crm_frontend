export default function Footer() {
  return (
    <footer className="px-6 py-5 text-center">
      <p className="text-gray-600 dark:text-gray-400 font-semibold tracking-wide text-sm">
        © {new Date().getFullYear()} Sona Hika — All Rights Reserved
      </p>
    </footer>
  );
}
