# Y86 Simulator Tests Documentation

| Test Name | Description | Expected Output |
| --- | --- | --- |
| asum.yo | Sample test | %eax = 0xabcd |
| Test_Halt.ys | To halt halfway. | %eax = 0x1 and %ebx = 0x0 |
| Test_Forwarding_Priorty.ys | To see if the simulator can correctly forward the most recently updated value of a register. | %eax = 0x3 |
| Test_Load_Use_Hazard.ys | To see if the simulator can correctly handle a load/use hazard.  | %eax = 0xd |
| Test_Mispredict_Jump.yo | To incur a S_INS in the mispredicted branch | No S_INS triggered and %ebx = 0xb |
| Test_Combination_A.ys | To see if the simulator can correctly handle a type A combination of hazards | %eax = 1 |
| Test_List_Summation.ys | To sum up the values of three elements in a list. | %eax = 0xcba |
| Test_Recursive_List_Summation.ys | Same as above but done with recursion. | %eax = 0xcba |