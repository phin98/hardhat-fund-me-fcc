import { deployments, ethers, getNamedAccounts } from "hardhat";
import { assert, expect } from "chai";
import { developmentChains } from "../../helper-hardhat-config"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", () => {
      describe("constructor", () => {
        let fundMe;
        let deployer;
        let mockV3Aggregator;
        const sendValue = ethers.utils.parseEther("1");

        beforeEach(async () => {
          // deploy our fundMe contract using hardhat deploy
          const accounts = await ethers.getSigners();
          // const accountZero = accounts[0]
          deployer = (await getNamedAccounts()).deployer;
          await deployments.fixture(["all"]);
          fundMe = await ethers.getContract("FundMe");
          mockV3Aggregator = await ethers.getContract("MockV3Aggregator");
        });

        describe("constructor", async () => {
          it("should set the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFeed();
            assert.equal(response, mockV3Aggregator.address);
          });

          it("should set the owner address to the deployer", async () => {
            const response = await fundMe.getOwner();
            assert.equal(response, deployer);
          });
        });

        describe("fund", () => {
          it("should fail if not enough ETH is sent", async () => {
            await expect(fundMe.fund()).to.be.revertedWith(
              "You need to spend more ETH!"
            );
          });

          it("should update the amount funded data structure ", async () => {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.getAddressToAmountFunded(deployer);
            assert.equal(response.toString(), sendValue.toString());
          });

          it("should add funder to array of funders", async () => {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.getFunder(0);
            assert.equal(funder, deployer);
          });
        });

        describe("withdraw", () => {
          beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
          });

          it("should withdraw ETH from a single funder", async () => {
            const startingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );
            const startingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            const transactionResponse = await fundMe.withdraw();
            const transcationReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transcationReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );

            assert.equal(endingFundMeBalance, 0);
            assert.equal(
              startingDeployerBalance.add(startingFundMeBalance).toString(),
              endingDeployerBalance.add(gasCost).toString()
            );
          });

          it("should cheaperWithdraw ETH from a single funder", async () => {
            const startingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );
            const startingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            const transactionResponse = await fundMe.cheaperWithdraw();
            const transcationReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transcationReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );

            assert.equal(endingFundMeBalance, 0);
            assert.equal(
              startingDeployerBalance.add(startingFundMeBalance).toString(),
              endingDeployerBalance.add(gasCost).toString()
            );
          });

          it("should allow us to withdraw with multiple funders", async () => {
            const accounts = await ethers.getSigners();
            for (let i = 1; i < 6; i++) {
              const fundMeConnectedContract = await fundMe.connect(accounts[i]);
              await fundMeConnectedContract.fund({ value: sendValue });
            }

            const startingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );
            const startingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );

            const transactionResponse = await fundMe.withdraw();
            const transcationReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transcationReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );

            assert.equal(endingFundMeBalance, 0);
            assert.equal(
              startingDeployerBalance.add(startingFundMeBalance).toString(),
              endingDeployerBalance.add(gasCost).toString()
            );

            // Make sure funders are reset properly
            await expect(fundMe.getFunder(0)).to.be.reverted;
            for (let i = 1; i < 6; i++) {
              assert.equal(
                await fundMe.getAddressToAmountFunded(accounts[i].address),
                0
              );
            }
          });

          it("should allow us to cheap withdraw with multiple funders", async () => {
            const accounts = await ethers.getSigners();
            for (let i = 1; i < 6; i++) {
              const fundMeConnectedContract = await fundMe.connect(accounts[i]);
              await fundMeConnectedContract.fund({ value: sendValue });
            }

            const startingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );
            const startingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );

            const transactionResponse = await fundMe.cheaperWithdraw();
            const transcationReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transcationReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );

            assert.equal(endingFundMeBalance, 0);
            assert.equal(
              startingDeployerBalance.add(startingFundMeBalance).toString(),
              endingDeployerBalance.add(gasCost).toString()
            );

            // Make sure funders are reset properly
            await expect(fundMe.getFunder(0)).to.be.reverted;
            for (let i = 1; i < 6; i++) {
              assert.equal(
                await fundMe.getAddressToAmountFunded(accounts[i].address),
                0
              );
            }
          });

          it("should only allow the owner to withdraw", async () => {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(
              attackerConnectedContract.withdraw()
            ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
          });
        });
      });
    });
