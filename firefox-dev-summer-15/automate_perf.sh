#!/bin/sh

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx run --static-args "{ \"performance\" : true }" &> perf.txt
cfx run --static-args "{ \"performance\" : true, \"parallel\" : true }" &> perf_parallel.txt
cfx run --static-args "{ \"performance\" : true, \"logsize\" : 100000 }" &> perf_big_log.txt
cfx run --static-args "{ \"performance\" : true, \"parallel\" : true, \"logsize\" : 100000 }" &> perf_parallel_big_log.txt

# for A in 1 2 3 4 5
# do
#     if [ "$1" != "false" ]; then
#         cfx run --static-args "{ \"performance\" : true, \"logging\" : true }" --profiledir=profiles/perf/ &> perf_"$A"_logging_true_full_db.txt
#     fi
#     ../performance_testing/grep_performance_events.sh perf_"$A"_logging_true_full_db.txt | python ../performance_testing/analyze_perf_logs.py > perf_"$A"_analysis_logging_true_full_db.json
# done
# join_json.py --include-filename perf_*_analysis_logging_true_full_db.json > perf_logging_true_full_db.csv

# for A in 1 2 3 4 5
# do
#     if [ "$1" != "false" ]; then
#         cfx run --static-args "{ \"performance\" : true, \"logging\" : false }" --profiledir=profiles/perf/ &> perf_"$A"_logging_false_full_db.txt
#     fi
#     ../performance_testing/grep_performance_events.sh perf_"$A"_logging_false_full_db.txt | python ../performance_testing/analyze_perf_logs.py > perf_"$A"_analysis_logging_false_full_db.json
# done
# join_json.py --include-filename perf_*_analysis_logging_false_full_db.json > perf_logging_false_full_db.csv

# for A in 1 2 3 4 5
# do
#     if [ "$1" != "false" ]; then
#         cfx run --static-args "{ \"performance\" : true, \"logging\" : true }" &> perf_"$A"_logging_true_empty_db.txt
#     fi
#     ../performance_testing/grep_performance_events.sh perf_"$A"_logging_true_empty_db.txt | python ../performance_testing/analyze_perf_logs.py > perf_"$A"_analysis_logging_true_empty_db.json
# done
# join_json.py --include-filename perf_*_analysis_logging_true_empty_db.json > perf_logging_true_empty_db.csv

# for A in 1 2 3 4 5
# do
#     if [ "$1" != "false" ]; then
#         cfx run --static-args "{ \"performance\" : true, \"logging\" : false }" &> perf_"$A"_logging_false_empty_db.txt
#     fi
#     ../performance_testing/grep_performance_events.sh perf_"$A"_logging_false_empty_db.txt | python ../performance_testing/analyze_perf_logs.py > perf_"$A"_analysis_logging_false_empty_db.json
# done
# join_json.py --include-filename perf_*_analysis_logging_false_empty_db.json > perf_logging_false_empty_db.csv

# join_json.py --include-filename perf_*.json > perf.csv
