// Prevents additional console window on Windows in all build profiles (debug and release)
#![windows_subsystem = "windows"]

fn main() {
    ryz_auth_lib::run();
}
