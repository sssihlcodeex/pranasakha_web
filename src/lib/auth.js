export function getCurrentUser(){if(typeof window==="undefined")return null;const raw=localStorage.getItem("pranasakha_user");if(!raw)return null;try{return JSON.parse(raw);}catch{return null;}}
export function setCurrentUser(user){localStorage.setItem("pranasakha_user",JSON.stringify(user));}
export function getAuthToken(){return getCurrentUser()?.token||"";}
export function isLoggedIn(){return !!getCurrentUser();}
export function logout(){localStorage.removeItem("pranasakha_user");}
export const ROLE_HOME={doctor:"/dashboard/doctor",director:"/dashboard/directorate",hod:"/dashboard/hod",accommodation:"/dashboard/accommodation",mandir:"/dashboard/mandir",travel:"/dashboard/travel",it:"/dashboard/it"};
