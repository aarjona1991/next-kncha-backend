/**
 * Seed Uruguay zones (ciudades / barrios) for the MVP feed.
 *
 * Usage:
 *   yarn seed:zones
 *   npx tsx scripts/seed-zones.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type ZoneSeed = {
  id: string;
  name: string;
  city: string;
  department: string;
};

const ZONES: ZoneSeed[] = [
  // Montevideo
  { id: "uy-mvd-centro", name: "Centro", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-cordon", name: "Cordón", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-palermo", name: "Palermo", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-pocitos", name: "Pocitos", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-punta-carretas", name: "Punta Carretas", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-malvin", name: "Malvín", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-carrasco", name: "Carrasco", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-buceo", name: "Buceo", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-parque-rodo", name: "Parque Rodó", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-tres-cruces", name: "Tres Cruces", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-prado", name: "Prado", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-cerro", name: "Cerro", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-union", name: "Unión", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-goes", name: "Goes", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-la-blanqueada", name: "La Blanqueada", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-parque-batlle", name: "Parque Batlle", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-villa-espanola", name: "Villa Española", city: "Montevideo", department: "Montevideo" },
  { id: "uy-mvd-paso-molino", name: "Paso Molino", city: "Montevideo", department: "Montevideo" },
  // Área metropolitana
  { id: "uy-can-ciudad-de-la-costa", name: "Ciudad de la Costa", city: "Ciudad de la Costa", department: "Canelones" },
  { id: "uy-can-las-piedras", name: "Las Piedras", city: "Las Piedras", department: "Canelones" },
  { id: "uy-can-pando", name: "Pando", city: "Pando", department: "Canelones" },
  { id: "uy-can-atlantida", name: "Atlántida", city: "Atlántida", department: "Canelones" },
  { id: "uy-sj-ciudad-del-plata", name: "Ciudad del Plata", city: "Ciudad del Plata", department: "San José" },
  // Interior (ciudades principales)
  { id: "uy-salto-salto", name: "Salto", city: "Salto", department: "Salto" },
  { id: "uy-paysandu-paysandu", name: "Paysandú", city: "Paysandú", department: "Paysandú" },
  { id: "uy-rivera-rivera", name: "Rivera", city: "Rivera", department: "Rivera" },
  { id: "uy-maldonado-maldonado", name: "Maldonado", city: "Maldonado", department: "Maldonado" },
  { id: "uy-maldonado-punta-del-este", name: "Punta del Este", city: "Punta del Este", department: "Maldonado" },
  { id: "uy-colonia-colonia", name: "Colonia del Sacramento", city: "Colonia del Sacramento", department: "Colonia" },
  { id: "uy-tacuarembo-tacuarembo", name: "Tacuarembó", city: "Tacuarembó", department: "Tacuarembó" },
  { id: "uy-mercedes-mercedes", name: "Mercedes", city: "Mercedes", department: "Soriano" },
  { id: "uy-durazno-durazno", name: "Durazno", city: "Durazno", department: "Durazno" },
  { id: "uy-florida-florida", name: "Florida", city: "Florida", department: "Florida" },
  { id: "uy-maldonado-san-carlos", name: "San Carlos", city: "San Carlos", department: "Maldonado" },
  { id: "uy-artigas-artigas", name: "Artigas", city: "Artigas", department: "Artigas" },
  { id: "uy-cerrolargo-melo", name: "Melo", city: "Melo", department: "Cerro Largo" },
  { id: "uy-treintaytres-treinta-y-tres", name: "Treinta y Tres", city: "Treinta y Tres", department: "Treinta y Tres" },
  { id: "uy-rocha-rocha", name: "Rocha", city: "Rocha", department: "Rocha" },
  { id: "uy-lavalleja-minas", name: "Minas", city: "Minas", department: "Lavalleja" },
  { id: "uy-flores-trinidad", name: "Trinidad", city: "Trinidad", department: "Flores" },
  { id: "uy-rio-negro-fray-bentos", name: "Fray Bentos", city: "Fray Bentos", department: "Río Negro" },
];

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env vars");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  const db = getFirestore();
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  // Migrate legacy default zone id from seed-admin if present
  const legacy = await db.collection("zones").doc("uy-montevideo-centro").get();
  if (legacy.exists) {
    const data = legacy.data();
    await db.collection("zones").doc("uy-mvd-centro").set(
      {
        name: data?.name ?? "Centro",
        city: data?.city ?? "Montevideo",
        department: data?.department ?? "Montevideo",
        active: true,
        createdAt: data?.createdAt ?? now,
        updatedAt: now,
      },
      { merge: true },
    );
    // keep legacy active too so existing admin profile zoneId still works
  }

  for (const zone of ZONES) {
    const ref = db.collection("zones").doc(zone.id);
    const snap = await ref.get();
    await ref.set(
      {
        name: zone.name,
        city: zone.city,
        department: zone.department,
        active: true,
        createdAt: snap.exists ? (snap.data()?.createdAt ?? now) : now,
        updatedAt: now,
      },
      { merge: true },
    );
    if (snap.exists) updated += 1;
    else created += 1;
  }

  console.log(
    `Zones seed done. created=${created} updated=${updated} total=${ZONES.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
