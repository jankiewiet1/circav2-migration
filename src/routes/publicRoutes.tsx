import { Route } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import SignUp from "@/pages/auth/SignUp";
import Help from "@/pages/Help";
import Callback from "@/pages/auth/Callback";
import Success from "@/app/auth/success/page";
import { useEffect } from "react";

// Set document title and favicon
document.title = "Circa - Carbon Management Platform";

// Create a link element for the favicon
const setFavicon = () => {
  const link = document.createElement('link');
  link.type = 'image/svg+xml';
  link.rel = 'shortcut icon';
  link.href = "data:image/svg+xml,%3Csvg width='36' height='36' viewBox='0 0 36 36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%230E5D40'/%3E%3Cpath d='M14 12C14 12 18 12 22 12C26 12 28 14 28 18C28 22 26 24 22 24H14' stroke='white' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M18 15L15 18L18 21' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
  document.head.appendChild(link);
};

// Component for setting effect
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
    <Route path="/auth/signup" element={<SignUp />} />
    <Route path="/auth/callback" element={<Callback />} />
    <Route path="/auth/success" element={<Success />} />
    <Route path="/help" element={<Help />} />
  </>
);
