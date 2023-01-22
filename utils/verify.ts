import { run } from "hardhat";
import { TaskArguments } from "hardhat/types";

const verify = async (contractAddress: string, args: TaskArguments) => {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified!");
    } else {
      console.log(e);
    }
  }
};

export default verify;
