import sh from "shelljs";
sh.rm("-rf", "toml-test");
sh.exec("git clone https://github.com/BurntSushi/toml-test.git");
sh.cd('toml-test');
sh.exec("go build ./cmd/toml-test");