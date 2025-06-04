import { Route } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import AcceptInvite from "@/pages/auth/AcceptInvite";
import Help from "@/pages/Help";
import Callback from "@/pages/auth/Callback";
import Success from "@/app/auth/success/page";
import { useEffect } from "react";

// Set document title and favicon
document.title = "Circa - Carbon Management Platform";

// Create a link element for the favicon with new design
const setFavicon = () => {
  const link = document.createElement('link');
  link.type = 'image/svg+xml';
  link.rel = 'shortcut icon';
  link.href = "data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%234ade80;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2316a34a;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='16' cy='16' r='16' fill='url(%23grad)'/%3E%3Cpath d='M 16 4 A 12 12 0 1 1 16 28' stroke='white' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Cpath d='M 16 8 A 8 8 0 1 1 16 24' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";
  document.head.appendChild(link);
};

// Call it immediately
setFavicon();

// Component to set up route-specific effects
const RouteEffects = () => {
  useEffect(() => {
    setFavicon();
  }, []);
  
  return null;
};

export const publicRoutes = (
  <>
    <Route path="/" element={<><RouteEffects /><Index /></>} />
    <Route path="/auth/login" element={<Login />} />
    <Route path="/auth/register" element={<Register />} />
    <Route path="/auth/signup" element={<Register />} />
    <Route path="/accept-invite" element={<AcceptInvite />} />
    <Route path="/auth/callback" element={<Callback />} />
    <Route path="/auth/success" element={<Success />} />
    <Route path="/help" element={<Help />} />
  </>
);
