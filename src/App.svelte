<script>
  import Dynamic from "./Dynamic.svelte";
  import Calculated from "./Calculated.svelte";

  let VO2, BSA, MAP, feet, CM, KG, feetRemainder, CO, SV;
  let LB = 140,
    inches = 70,
    HGB = 14,
    Age = 70,
    SaO2 = 100,
    SvO2 = 70,
    CVP = 6,
    PASP = 18,
    PADP = 10,
    HR = 80,
    SBP = 120,
    DBP = 80,
    EF = 55,
    PAWP = 10;

  $: feet = inches / 12; // Converts inches to feet
  $: CM = inches * 2.54; // Converts inches to cm
  $: KG = LB * 0.45359237; // Converts lbs to kg
  $: feetRemainder = inches % 12; // for height, remainder inches

  $: BSA = Math.sqrt((inches * 2.54 * LB * 0.45359237) / 3600); // BSA based on height/weight
  $: Age >= 70 ? (VO2 = 110 * BSA) : (VO2 = 125 * BSA); // O2 delivery based on age and BSA
  $: CO = VO2 / (((SaO2 - SvO2) / 100) * HGB * 13.4); // Cardiac Output
  $: CO2 = (HR * SV) / 1000; // Cardiac output from SV
  $: CPO = (MAP * CO) / 451; // Cardiac Power Output
  $: CI = CO / BSA; // Cardiac Index

  $: SVR = (80 * (MAP - CVP)) / CO;
  $: SVRI = (80 * (MAP - CVP)) / CI;
  $: PVR = (80 * (MPAP - PAWP)) / CO;
  $: PVRI = (80 * (MPAP - PAWP)) / CI;

  $: MAP = (SBP + 2 * DBP) / 3;
  $: MPAP = (PASP + 2 * PADP) / 3;
  $: PAPI = (PASP - PADP) / CVP;

  $: SV = (CO / HR) * 1000;
  $: SVI = (CI / HR) * 1000;
  $: LVSW = SV * (MAP - PAWP) * 0.0136;
  $: LVSWI = SVI * (MAP - PAWP) * 0.0136;
  $: RVSW = SV * (MPAP - CVP) * 0.0136;
  $: RVSWI = SVI * (MPAP - CVP) * 0.0136;
</script>

<main>
  <div class="container flex justify-center max-w-6xl align-middle">
    <div
      class="flex flex-col w-full px-2 py-4 my-6 rounded-lg lg:p-24 lg:border-2 lg:border-solid lg:border-zinc-900 xl:max-w-6xl"
    >
      <div class="py-4 border-b md:mb-12 top border-zinc-400">
        <h2>Extended Cardiac Physiology</h2>
        <div class="grid grid-cols-1 md:grid-cols-2">
          <Calculated data={CO} min={4}>
            Cardiac output (CO) (4 - 8 L/min):
          </Calculated>

          <Calculated data={CI} min={2}>
            Cardiac index (CI) (2 - 4 L/min/m2):
          </Calculated>

          <Calculated data={CPO}>Cardiac power output (CPO):</Calculated>

          <Calculated data={PAPI}>
            Pulmonary artery pulsatile index (PAPI):
          </Calculated>

          <Calculated data={SV}>Stroke volume (SV):</Calculated>

          <Calculated data={SVI}>Stroke volume index (SVI):</Calculated>

          <Calculated data={MPAP}>Mean Artery Pressure (MPAP):</Calculated>

          <Calculated data={SVR} min={900} max={1440}>
            Systemic vascular resistance (SVR):
          </Calculated>

          <Calculated data={SVRI}>
            Systemic vascular resistance index (SVRI):
          </Calculated>

          <Calculated data={MPAP}>
            Mean Pulmonary Artery Pressure (MPAP):
          </Calculated>

          <Calculated data={PVR}>
            Pulmonary vascular resistance (PVR):
          </Calculated>

          <Calculated data={PVRI}>
            Pulmonary vascular resistance index (PVRI):
          </Calculated>

          <Calculated data={LVSW}>
            Left ventricular stroke work (LVSW):
          </Calculated>

          <Calculated data={LVSWI}>
            Left ventricular stroke work index (LVSWI):
          </Calculated>

          <Calculated data={RVSW}>
            Right ventricular stroke work (RVSW):
          </Calculated>

          <Calculated data={RVSWI}>
            Right ventricular stroke work index (RVSWI):
          </Calculated>
        </div>
      </div>
      <div
        class="grid grid-cols-1 mt-4 md:mt-4 md:grid-cols-2 gap-x-6 gap-y-2 bottom"
      >
        <Dynamic
          min={40}
          max={300}
          result={LB}
          on:slide={(e) => (LB = e.detail.result)}
        >
          Weight (lbs)
          {Math.round(KG)} Kg
        </Dynamic>

        <Dynamic
          min={53}
          max={76}
          result={inches}
          on:slide={(e) => (inches = e.detail.result)}
        >
          Height (in)
          {Math.floor(feet)}"{Math.round(feetRemainder)}
          {Math.round(CM * 100) / 100} cm
        </Dynamic>

        <Dynamic
          min={60}
          max={100}
          result={SaO2}
          on:slide={(e) => (SaO2 = e.detail.result)}
        >
          SaO2
        </Dynamic>

        <Dynamic
          min={30}
          max={100}
          result={SvO2}
          on:slide={(e) => (SvO2 = e.detail.result)}
        >
          SvO2
        </Dynamic>

        <Dynamic
          min={4}
          max={17}
          step={0.1}
          result={HGB}
          on:slide={(e) => (HGB = e.detail.result)}
        >
          Hemoglobin
        </Dynamic>

        <Dynamic
          min={1}
          max={100}
          result={Age}
          on:slide={(e) => (Age = e.detail.result)}
        >
          Age
        </Dynamic>

        <Dynamic
          min={20}
          max={200}
          result={HR}
          on:slide={(e) => (HR = e.detail.result)}
        >
          HR
        </Dynamic>

        <Dynamic
          min={1}
          max={15}
          result={CO}
          on:slide={(e) => (CO = e.detail.result)}
        >
          CO calculated using O2 delivery
        </Dynamic>

        <Dynamic
          min={1}
          max={15}
          result={CO2}
          on:slide={(e) => (CO2 = e.detail.result)}
        >
          CO calculated using stroke volume
        </Dynamic>

        <Dynamic
          min={10}
          max={150}
          result={SV}
          on:slide={(e) => (SV = e.detail.result)}
        >
          Stroke volume
        </Dynamic>

        <Dynamic
          min={0}
          max={100}
          result={SVI}
          on:slide={(e) => (SVI = e.detail.result)}
        >
          Stroke volume index
        </Dynamic>

        <Dynamic
          min={60}
          max={240}
          result={SBP}
          on:slide={(e) => (SBP = e.detail.result)}
        >
          Systolic blood pressure
        </Dynamic>

        <Dynamic
          min={10}
          max={120}
          result={DBP}
          on:slide={(e) => (DBP = e.detail.result)}
        >
          Diastolic blood pressure
        </Dynamic>

        <Dynamic
          min={15}
          max={25}
          result={PASP}
          on:slide={(e) => (PASP = e.detail.result)}
        >
          PA systolic pressure
        </Dynamic>

        <Dynamic
          min={8}
          max={15}
          result={PADP}
          on:slide={(e) => (PADP = e.detail.result)}
        >
          PA diastolic pressure
        </Dynamic>

        <Dynamic
          min={0}
          max={20}
          result={CVP}
          on:slide={(e) => (CVP = e.detail.result)}
        >
          CVP
        </Dynamic>

        <Dynamic
          min={6}
          max={12}
          result={PAWP}
          on:slide={(e) => (PAWP = e.detail.result)}
        >
          Pulmonary arterial wedge pressure
        </Dynamic>

        <Dynamic
          min={15}
          max={70}
          result={EF}
          on:slide={(e) => (EF = e.detail.result)}
        >
          Ejection fraction
        </Dynamic>
      </div>
    </div>
  </div>
</main>

<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @font-face {
    font-family: "Concourse";
    src: url("fonts/concourse_3_regular.woff2") format("woff2");
    font-style: normal;
  }
  @font-face {
    font-family: "Equity";
    src: url("fonts/equity_a_regular.woff2") format("woff2");
    font-style: normal;
  }
  @layer components {
    body {
      @apply text-zinc-800 text-lg font-serif;
    }
    h1 {
      @apply text-xl font-bold uppercase mb-4;
    }
    h2 {
      @apply text-lg font-bold uppercase mb-2;
    }
    p {
      @apply text-zinc-800 text-lg font-serif;
    }
    ::selection {
      @apply bg-slate-200;
    }
    .btn {
      @apply btn-disabled p-3 shadow font-semibold rounded-lg border-2 border-solid border-zinc-800 bg-zinc-50
		font-sans hover:bg-white text-zinc-800 hover:text-black;
    }
    .btn-dark {
      @apply btn border-0 bg-zinc-800 text-zinc-50 hover:bg-zinc-900 hover:text-white transition duration-300;
    }
    .btn-disabled {
      @apply disabled:text-zinc-500 disabled:hover:text-zinc-500 disabled:bg-zinc-50 disabled:hover:bg-zinc-50 disabled:border-zinc-500 disabled:hover:border-zinc-500;
    }
    .select {
      @apply font-semibold focus:outline-none focus:bg-white focus:border-zinc-800 border-zinc-800 border-2 border-solid bg-zinc-50 text-zinc-800 rounded-md   outline-none focus:ring-0;
    }
    .label {
      @apply font-semibold text-sm;
    }
    .input-text {
      @apply px-2 max-h-12 focus:bg-white focus:ring-0 w-12   focus:border-zinc-800 border-zinc-200  py-2 rounded-md bg-zinc-50  font-semibold;
    }
    .input-checkbox {
      @apply rounded-sm border-2 border-solid w-4 h-4 focus:ring-0  text-zinc-800 border-zinc-800;
    }
    .warning {
      @apply text-red-700;
    }
    input[type="range"] {
      @apply flex-grow;
    }
    .line {
      @apply flex space-x-2 items-center;
    }
  }
</style>
