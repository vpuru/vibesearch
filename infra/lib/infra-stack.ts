import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use the default VPC
    const vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "VibeSearchCluster", {
      vpc,
      defaultCloudMapNamespace: {
        name: "vibesearch.local",
        type: servicediscovery.NamespaceType.DNS_PRIVATE,
      },
    });

    // Backend Fargate Service (internal, port 8080)
    const backendService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "BackendService",
      {
        cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("varunpuru2/vibesearch-backend:latest"),
          containerPort: 8080,
          environment: {
            PYTHONUNBUFFERED: "1",
          },
        },
        publicLoadBalancer: false, // Internal only
        desiredCount: 1,
        assignPublicIp: true,
        listenerPort: 8080,
        serviceName: "backend",
        cloudMapOptions: {
          name: "backend",
        },
        memoryLimitMiB: 2048, // 1 GiB (try 2048 if you still see OOM)
        cpu: 512, // 0.5 vCPU (optional, but good to increase with memory)
      }
    );

    // Frontend Fargate Service (public, port 80)
    const frontendService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "FrontendService",
      {
        cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("varunpuru2/vibesearch-frontend:latest"),
          containerPort: 80,
        },
        publicLoadBalancer: true, // Expose to internet
        desiredCount: 1,
        assignPublicIp: true,
        listenerPort: 80,
        serviceName: "frontend",
        cloudMapOptions: {
          name: "frontend",
        },
      }
    );

    // Allow frontend tasks to talk to backend via service discovery
    backendService.service.connections.allowFrom(frontendService.service, ec2.Port.tcp(8080));

    // Add explicit dependencies to ensure ECS services wait for target groups
    backendService.service.node.addDependency(backendService.targetGroup);
    frontendService.service.node.addDependency(frontendService.targetGroup);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
