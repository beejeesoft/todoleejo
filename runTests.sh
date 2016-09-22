

jasmine-node spec/prepare_spec.js

for file in `find spec -name "*Test_spec.js"`
do
    jasmine-node $file
done
