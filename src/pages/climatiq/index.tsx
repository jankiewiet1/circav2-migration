import Head from 'next/head';
import { ClimatiqCalculator } from '../../components/climatiq/ClimatiqCalculator';

export default function ClimatiqPage() {
  return (
    <>
      <Head>
        <title>Climatiq Carbon Calculator</title>
        <meta
          name="description"
          content="Calculate carbon emissions for various activities using the Climatiq API"
        />
      </Head>
      <main className="container mx-auto px-4 py-8">
        <ClimatiqCalculator />
      </main>
    </>
  );
} 