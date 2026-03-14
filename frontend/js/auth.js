/* SIGNUP */

const signupForm = document.getElementById("signupForm");

if (signupForm) {
signupForm.addEventListener("submit", function(e){

e.preventDefault();

const fullName = document.getElementById("fullName").value.trim();
const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value;
const confirmPassword = document.getElementById("confirmPassword").value;
const message = document.getElementById("authMessage");

if(password !== confirmPassword){
message.textContent = "Passwords do not match";
return;
}

const user = {
fullName,
email,
password
};

localStorage.setItem("user", JSON.stringify(user));

message.style.color = "green";
message.textContent = "Signup successful. Please login.";

signupForm.reset();

});
}


/* LOGIN */

const loginForm = document.getElementById("loginForm");

if(loginForm){

loginForm.addEventListener("submit", function(e){

e.preventDefault();

const email = document.getElementById("loginEmail").value;
const password = document.getElementById("loginPassword").value;

const message = document.getElementById("loginMessage");

const storedUser = JSON.parse(localStorage.getItem("user"));

if(!storedUser){
message.textContent = "No account found. Please sign up.";
return;
}

if(email === storedUser.email && password === storedUser.password){

message.style.color = "green";
message.textContent = "Login successful";

setTimeout(()=>{
window.location.href = "uv-dashboard.html";
},1000);

}
else{
message.textContent = "Invalid email or password";
}

});

}