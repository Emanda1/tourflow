import { company } from "@/lib/config";

/** The company's uploaded logo (Admin → Settings), or the coloured square if none has been uploaded. */
export default function LogoMark() {
  return company.logo
    ? <img src={company.logo} alt="" className="logo-img" />
    : <span className="logo-mark" />;
}
