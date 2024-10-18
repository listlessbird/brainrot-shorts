import Link from "next/link";

export default async function Page() {
  return (
    <>
      <h1>Sign in</h1>
      <Link href="/login/google">Sign in with Google</Link>
    </>
  );
}
