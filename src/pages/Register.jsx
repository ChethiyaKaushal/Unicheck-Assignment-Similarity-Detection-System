import { Link } from "react-router-dom";
export default function Register() {
  return <main className="flex min-h-screen items-center justify-center bg-emerald-50 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-8 shadow"><h1 className="text-3xl font-bold text-center text-emerald-700">UniCheck</h1><h2 className="mt-5 text-xl font-semibold">Account access</h2><p className="mt-3 text-gray-600">UniCheck accounts are created by an administrator. Ask your lecturer or system administrator for an account, then sign in here.</p><Link to="/login" className="mt-6 block rounded-lg bg-emerald-600 p-3 text-center text-white">Go to sign in</Link></section></main>;
}
