# Y86 Simulator Tests Documentation

| Test Name | Description | Expected Output |
| --- | --- | --- |
| asum.yo | Sample test | %eax = 0xabcd |
| Halt.ys | To halt halfway. | %eax = 0x1 and %ebx = 0x0 |
| Forwarding.ys | To see if the simulator can correctly forward the most recently updated value of a register. | %eax = 0x3 |
| Load_Use.ys | To see if the simulator can correctly handle a load/use hazard.  | %eax = 0xd |
| Comb_A.ys | To see if the simulator can correctly handle a type A combination of hazards | %eax = 1 |
| List_Sum.ys | To sum up the values of three elements in a list. | %eax = 0xcba |
| List_Sum_R.ys | Same as above but done with recursion. | %eax = 0xcba |